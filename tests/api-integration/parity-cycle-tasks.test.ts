import { createHash } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { afterEach, beforeEach, expect, it, vi } from "vite-plus/test";
import db, { schema } from "../../apps/api/src/database";
import {
  cycleTable,
  projectMilestoneTable,
  taskExtTable,
  workspaceExtTable,
} from "../../apps/api/src/database/schema-parity";
import { readableProjects } from "../../apps/api/src/parity/planning/access";
import { cycleTotalsByProject } from "../../apps/api/src/parity/cycles/totals-query";
import { getTaskCycleProperties } from "../../apps/api/src/parity/cycles/task-read";
import { mockAnonymousSession, mockAuthenticatedSession } from "./helpers/auth";
import { resetTestDatabase } from "./helpers/database";
import { createWorkspaceMember } from "./helpers/fixtures";
import { addWorkspaceMember } from "./helpers/project-access/add-workspace-member";
import { createRestrictedWorkspace } from "./helpers/project-access/create-restricted-workspace";
import { projectAccessApi } from "./helpers/project-access/project-access-api";

beforeEach(async () => {
  await resetTestDatabase();
  vi.stubEnv("PARITY_FEATURES", "cycles,projects");
});
afterEach(() => vi.unstubAllEnvs());

async function setup() {
  const c = await createRestrictedWorkspace();
  mockAuthenticatedSession(c.owner);
  const [cycle] = await db
    .insert(cycleTable)
    .values({
      workspaceId: c.workspace.id,
      number: 1,
      startsAt: new Date("2026-11-09T00:00:00Z"),
      endsAt: new Date("2026-11-16T00:00:00Z"),
    })
    .returning();
  await db.insert(workspaceExtTable).values({
    workspaceId: c.workspace.id,
    estimateScale: "fibonacci",
    cyclesEnabled: true,
  });
  const request = projectAccessApi();
  const send = async (path: string, method = "GET", body?: unknown) => {
    const response = await request(`/parity/${path}`, { method, body });
    const result = await response.json();
    expect(response.status, JSON.stringify(result)).toBe(200);
    return result;
  };
  return { ...c, cycle: cycle!, request, send };
}

it("serves compact project assignments without leaking hidden, triage, or foreign-workspace cycles", async () => {
  const c = await setup();
  await db
    .update(cycleTable)
    .set({
      startsAt: new Date(Date.now() - 86_400_000),
      endsAt: new Date(Date.now() + 86_400_000),
    })
    .where(eq(cycleTable.id, c.cycle.id));
  await db.insert(taskExtTable).values([
    { taskId: c.alphaTask.id, cycleId: c.cycle.id },
    { taskId: c.betaTask.id, cycleId: c.cycle.id },
  ]);
  mockAuthenticatedSession(c.restricted);
  const path = `cycle/project/${c.alpha.id}/tasks`;
  expect(await c.send(path)).toEqual({
    currentCycleId: c.cycle.id,
    items: [{ taskId: c.alphaTask.id, cycleId: c.cycle.id }],
  });
  expect(
    (await c.request(`/parity/cycle/project/${c.beta.id}/tasks`)).status,
  ).toBe(403);
  await db
    .update(taskExtTable)
    .set({ triageState: "pending" })
    .where(eq(taskExtTable.taskId, c.alphaTask.id));
  expect((await c.send(path)).items).toEqual([]);
  const other = await createWorkspaceMember({ role: "owner" });
  const [foreign] = await db
    .insert(cycleTable)
    .values({
      workspaceId: other.workspace.id,
      number: 1,
      startsAt: new Date(),
      endsAt: new Date(Date.now() + 86_400_000),
    })
    .returning();
  await db
    .update(taskExtTable)
    .set({ triageState: "accepted", cycleId: foreign!.id })
    .where(eq(taskExtTable.taskId, c.alphaTask.id));
  expect((await c.send(path)).items).toEqual([]);
  vi.stubEnv("PARITY_FEATURES", "foundation");
  expect((await c.request(`/parity/${path}`)).status).toBe(404);
  vi.stubEnv("PARITY_FEATURES", "cycles");
  mockAnonymousSession();
  expect((await c.request(`/parity/${path}`)).status).toBe(401);
});

it("reads defaults and sets/clears properties without replacing other extension fields", async () => {
  const c = await setup();
  const path = `task/${c.alphaTask.id}`;
  expect(await c.send(`${path}/cycle-properties`)).toMatchObject({
    cycle: null,
    estimate: null,
    estimateScale: "fibonacci",
    cyclesEnabled: true,
  });
  const [milestone] = await db
    .insert(projectMilestoneTable)
    .values({ projectId: c.alpha.id, name: "Launch" })
    .returning();
  await db.insert(taskExtTable).values({
    taskId: c.alphaTask.id,
    milestoneId: milestone!.id,
    triageState: "accepted",
  });
  expect(
    await c.send(`${path}/cycle`, "PUT", { cycleId: c.cycle.id }),
  ).toMatchObject({ cycle: { id: c.cycle.id, number: 1 } });
  expect(
    await c.send(`${path}/estimate`, "PUT", { estimate: 8 }),
  ).toMatchObject({ estimate: 8 });
  await c.send(`${path}/estimate`, "PUT", { estimate: 8 });
  const estimateActivities = await db
    .select()
    .from(schema.activityTable)
    .where(
      and(
        eq(schema.activityTable.taskId, c.alphaTask.id),
        eq(schema.activityTable.type, "estimate_changed"),
      ),
    );
  expect(estimateActivities).toHaveLength(1);
  expect(estimateActivities[0]?.eventData).toMatchObject({
    oldEstimate: null,
    estimate: 8,
  });
  expect(await c.send(`${path}/cycle`, "PUT", { cycleId: null })).toMatchObject(
    { cycle: null },
  );
  expect(
    await c.send(`${path}/estimate`, "PUT", { estimate: null }),
  ).toMatchObject({ estimate: null });
  const [ext] = await db
    .select()
    .from(taskExtTable)
    .where(eq(taskExtTable.taskId, c.alphaTask.id));
  expect(ext).toMatchObject({
    milestoneId: milestone!.id,
    triageState: "accepted",
  });
});

it("validates estimates against the scale and allows clearing after estimates/cycles are disabled", async () => {
  const c = await setup();
  for (const [scale, invalid, valid] of [
    ["fibonacci", 4, 5],
    ["linear", 8, 4],
    ["t-shirt", 4, 8],
  ] as const) {
    await db
      .update(workspaceExtTable)
      .set({ estimateScale: scale })
      .where(eq(workspaceExtTable.workspaceId, c.workspace.id));
    expect(
      (
        await c.request(`/parity/task/${c.alphaTask.id}/estimate`, {
          method: "PUT",
          body: { estimate: invalid },
        })
      ).status,
    ).toBe(400);
    expect(
      await c.send(`task/${c.alphaTask.id}/estimate`, "PUT", {
        estimate: valid,
      }),
    ).toMatchObject({ estimate: valid });
  }
  await c.send(`task/${c.alphaTask.id}/cycle`, "PUT", { cycleId: c.cycle.id });
  await db
    .update(workspaceExtTable)
    .set({ estimateScale: "none", cyclesEnabled: false })
    .where(eq(workspaceExtTable.workspaceId, c.workspace.id));
  expect(
    (
      await c.request(`/parity/task/${c.alphaTask.id}/estimate`, {
        method: "PUT",
        body: { estimate: 1 },
      })
    ).status,
  ).toBe(400);
  expect(
    (
      await c.request(`/parity/task/${c.betaTask.id}/cycle`, {
        method: "PUT",
        body: { cycleId: c.cycle.id },
      })
    ).status,
  ).toBe(400);
  expect(
    await c.send(`task/${c.alphaTask.id}/estimate`, "PUT", { estimate: null }),
  ).toMatchObject({ estimate: null });
  expect(
    await c.send(`task/${c.alphaTask.id}/cycle`, "PUT", { cycleId: null }),
  ).toMatchObject({ cycle: null });
});

it("rejects foreign cycles and hides stale cross-workspace references", async () => {
  const c = await setup();
  const other = await createWorkspaceMember();
  const [foreign] = await db
    .insert(cycleTable)
    .values({
      workspaceId: other.workspace.id,
      number: 1,
      startsAt: c.cycle.startsAt,
      endsAt: c.cycle.endsAt,
    })
    .returning();
  expect(
    (
      await c.request(`/parity/task/${c.alphaTask.id}/cycle`, {
        method: "PUT",
        body: { cycleId: foreign!.id },
      })
    ).status,
  ).toBe(400);
  await db
    .insert(taskExtTable)
    .values({ taskId: c.alphaTask.id, cycleId: foreign!.id });
  expect(await c.send(`task/${c.alphaTask.id}/cycle-properties`)).toMatchObject(
    { cycle: null },
  );
});

it("denies hidden projects and keeps a bulk mutation atomic when one task is unavailable", async () => {
  const c = await setup();
  mockAuthenticatedSession(c.restricted);
  expect(
    (await c.request(`/parity/task/${c.betaTask.id}/cycle-properties`)).status,
  ).toBe(403);
  expect(
    (
      await c.request("/parity/task/bulk", {
        method: "PATCH",
        body: {
          taskIds: [c.alphaTask.id, c.betaTask.id],
          operation: "updateEstimate",
          value: 3,
        },
      })
    ).status,
  ).toBe(403);
  expect(
    (
      await c.request("/parity/task/bulk", {
        method: "PATCH",
        body: {
          taskIds: [c.alphaTask.id, "missing-task"],
          operation: "updateEstimate",
          value: 3,
        },
      })
    ).status,
  ).toBe(404);
  expect(await c.send(`task/${c.alphaTask.id}/cycle-properties`)).toMatchObject(
    { estimate: null },
  );
  await expect(
    getTaskCycleProperties(c.betaTask.id, {
      userId: c.restricted.id,
      workspaceId: c.workspace.id,
    }),
  ).rejects.toMatchObject({ status: 404 });
});

it("supports all three bulk operations, deduplicates IDs, and rejects mixed-project milestones", async () => {
  const c = await setup();
  const taskIds = [c.alphaTask.id, c.betaTask.id, c.alphaTask.id];
  expect(
    await c.send("task/bulk", "PATCH", {
      taskIds,
      operation: "updateCycle",
      value: c.cycle.id,
    }),
  ).toMatchObject({ updated: 2 });
  expect(
    await c.send("task/bulk", "PATCH", {
      taskIds,
      operation: "updateEstimate",
      value: 3,
    }),
  ).toMatchObject({ updated: 2 });
  expect(
    await c.send("task/bulk", "PATCH", {
      taskIds,
      operation: "updateEstimate",
      value: 3,
    }),
  ).toMatchObject({ updated: 0 });
  const [milestone] = await db
    .insert(projectMilestoneTable)
    .values({ projectId: c.alpha.id, name: "Launch" })
    .returning();
  expect(
    (
      await c.request("/parity/task/bulk", {
        method: "PATCH",
        body: { taskIds, operation: "updateMilestone", value: milestone!.id },
      })
    ).status,
  ).toBe(400);
  expect(
    await c.send("task/bulk", "PATCH", {
      taskIds: [c.alphaTask.id],
      operation: "updateMilestone",
      value: milestone!.id,
    }),
  ).toMatchObject({ updated: 1 });
  expect(
    await c.send("task/bulk", "PATCH", {
      taskIds,
      operation: "updateMilestone",
      value: null,
    }),
  ).toMatchObject({ updated: 1 });
  expect(
    (
      await c.request("/parity/task/bulk", {
        method: "PATCH",
        body: {
          taskIds: Array.from({ length: 101 }, () => c.alphaTask.id),
          operation: "updateEstimate",
          value: 2,
        },
      })
    ).status,
  ).toBe(400);
});

it("enforces flags, viewer permissions and read-only API key scope", async () => {
  const c = await setup();
  const viewer = await addWorkspaceMember(c.workspace.id, "viewer");
  mockAuthenticatedSession(viewer);
  expect(
    (await c.request(`/parity/task/${c.alphaTask.id}/cycle-properties`)).status,
  ).toBe(200);
  expect(
    (
      await c.request(`/parity/task/${c.alphaTask.id}/cycle`, {
        method: "PUT",
        body: { cycleId: c.cycle.id },
      })
    ).status,
  ).toBe(403);
  const key = `cycles-test-${c.restricted.id}`.padEnd(64, "x");
  await db.insert(schema.apikeyTable).values({
    referenceId: c.restricted.id,
    userId: c.restricted.id,
    key: createHash("sha256").update(key).digest("base64url"),
    createdAt: new Date(),
    updatedAt: new Date(),
    enabled: true,
    permissions: JSON.stringify({
      workspace: ["read"],
      project: ["read"],
      task: ["read"],
    }),
  });
  mockAnonymousSession();
  expect(
    (await c.request(`/parity/task/${c.alphaTask.id}/cycle-properties`)).status,
  ).toBe(401);
  const request = projectAccessApi({ "x-api-key": key });
  expect(
    (await request(`/parity/task/${c.alphaTask.id}/cycle-properties`)).status,
  ).toBe(200);
  expect(
    (await request(`/parity/task/${c.betaTask.id}/cycle-properties`)).status,
  ).toBe(403);
  expect(
    (
      await request(`/parity/task/${c.alphaTask.id}/estimate`, {
        method: "PUT",
        body: { estimate: 3 },
      })
    ).status,
  ).toBe(403);
  mockAuthenticatedSession(c.owner);
  vi.stubEnv("PARITY_FEATURES", "projects");
  expect(
    (await c.request(`/parity/task/${c.alphaTask.id}/cycle-properties`)).status,
  ).toBe(404);
  expect(
    (
      await c.request("/parity/task/bulk", {
        method: "PATCH",
        body: {
          taskIds: [c.alphaTask.id],
          operation: "updateCycle",
          value: null,
        },
      })
    ).status,
  ).toBe(404);
});

it("serializes repeated cycle assignment without duplicate activities", async () => {
  const c = await setup();
  const responses = await Promise.all(
    Array.from({ length: 4 }, () =>
      c.request(`/parity/task/${c.alphaTask.id}/cycle`, {
        method: "PUT",
        body: { cycleId: c.cycle.id },
      }),
    ),
  );
  expect(responses.map((response) => response.status)).toEqual([
    200, 200, 200, 200,
  ]);
  const activities = await db
    .select()
    .from(schema.activityTable)
    .where(
      and(
        eq(schema.activityTable.taskId, c.alphaTask.id),
        eq(schema.activityTable.type, "cycle_changed"),
      ),
    );
  expect(activities).toHaveLength(1);
});

it("computes live scope only from readable, accepted, non-canceled tasks", async () => {
  const c = await setup();
  await c.send("task/bulk", "PATCH", {
    taskIds: [c.alphaTask.id, c.betaTask.id],
    operation: "updateCycle",
    value: c.cycle.id,
  });
  await c.send(`task/${c.betaTask.id}/estimate`, "PUT", { estimate: 8 });
  const who = { userId: c.restricted.id, workspaceId: c.workspace.id };
  expect(
    await cycleTotalsByProject(
      [c.cycle.id],
      c.workspace.id,
      true,
      readableProjects(who),
    ),
  ).toEqual([
    expect.objectContaining({
      projectId: c.alpha.id,
      scopeCount: 1,
      scopePoints: 1,
    }),
  ]);
  await db
    .update(schema.taskTable)
    .set({ status: "canceled", columnId: null })
    .where(eq(schema.taskTable.id, c.alphaTask.id));
  expect(
    await cycleTotalsByProject(
      [c.cycle.id],
      c.workspace.id,
      true,
      readableProjects(who),
    ),
  ).toEqual([]);
  await db
    .update(taskExtTable)
    .set({ triageState: "pending" })
    .where(eq(taskExtTable.taskId, c.betaTask.id));
  expect(
    await cycleTotalsByProject([c.cycle.id], c.workspace.id, true),
  ).toEqual([]);
});

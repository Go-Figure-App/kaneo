import { createHash } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { afterEach, beforeEach, expect, it, vi } from "vite-plus/test";
import db, { schema } from "../../apps/api/src/database";
import { publishEvent } from "../../apps/api/src/events";
import { taskExtTable } from "../../apps/api/src/database/schema-parity";
import { invalidateInsights } from "../../apps/api/src/parity/insights/cache";
import { initializeInsights } from "../../apps/api/src/parity/insights/initialize";
import { syncLifecycle } from "../../apps/api/src/parity/foundation/controllers/sync-lifecycle";
import { insightsSchema } from "../../apps/api/src/parity/insights/schema";
import { mockAnonymousSession, mockAuthenticatedSession } from "./helpers/auth";
import { resetTestDatabase } from "./helpers/database";
import { createWorkspaceMember } from "./helpers/fixtures";
import { insightsFixture } from "./helpers/parity-insights";
import { projectAccessApi } from "./helpers/project-access/project-access-api";
import { restrictToProjects } from "./helpers/project-access/restrict-to-projects";

beforeEach(async () => {
  await resetTestDatabase();
  invalidateInsights();
  vi.stubEnv("PARITY_FEATURES", "insights");
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-11-13T12:00:00Z"));
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  invalidateInsights();
});

it("invalidates cached live metrics when task events arrive", async () => {
  const c = await insightsFixture();
  mockAuthenticatedSession(c.restricted);
  await initializeInsights();
  expect(
    (await report(c.workspace.id, { measure: "workload" })).rows[0]?.value,
  ).toBe(1);
  await db
    .update(schema.taskTable)
    .set({ status: "canceled", columnId: null })
    .where(eq(schema.taskTable.id, c.open.id));
  await publishEvent(
    "task.updated",
    { taskId: c.open.id, projectId: c.alpha.id },
    { waitForHandlers: true },
  );
  expect((await report(c.workspace.id, { measure: "workload" })).rows).toEqual(
    [],
  );
});

async function report(workspaceId: string, query: Record<string, string>) {
  const response = await projectAccessApi()(
    `/parity/insights/${workspaceId}?${new URLSearchParams({ from: "2026-11-01", to: "2026-11-13", ...query })}`,
  );
  expect(response.status, await response.clone().text()).toBe(200);
  return insightsSchema.parse(await response.json());
}

it("invalidates a report populated while lifecycle synchronization is waiting to commit", async () => {
  const c = await insightsFixture();
  mockAuthenticatedSession(c.restricted);
  await initializeInsights();
  await db
    .update(schema.taskTable)
    .set({ status: "done", columnId: null })
    .where(eq(schema.taskTable.id, c.open.id));
  const locked = Promise.withResolvers<void>();
  const release = Promise.withResolvers<void>();
  const blocker = db.transaction(async (tx) => {
    await tx.execute(
      sql`select id from ${schema.taskTable} where id = ${c.open.id} for update`,
    );
    locked.resolve();
    await release.promise;
  });
  await locked.promise;
  const pending = syncLifecycle(c.open.id, {
    projectId: c.alpha.id,
    status: "done",
    previousStatus: "to-do",
    at: new Date(),
  });
  try {
    const stale = await report(c.workspace.id, { measure: "throughput" });
    expect(stale.rows.reduce((sum, row) => sum + row.value, 0)).toBe(2);
  } finally {
    release.resolve();
    await blocker;
    await pending;
  }
  const fresh = await report(c.workspace.id, { measure: "throughput" });
  expect(fresh.rows.reduce((sum, row) => sum + row.value, 0)).toBe(3);
});

it("groups completed counts and estimates without hidden projects or label multiplication", async () => {
  const c = await insightsFixture();
  mockAuthenticatedSession(c.restricted);
  for (const slice of ["week", "cycle", "assignee", "project", "priority"]) {
    const result = await report(c.workspace.id, {
      measure: "throughput",
      slice,
    });
    expect(result.rows.reduce((sum, row) => sum + row.value, 0)).toBe(2);
    expect(result.rows.reduce((sum, row) => sum + (row.points ?? 0), 0)).toBe(
      8,
    );
    expect(JSON.stringify(result)).not.toContain(c.beta.id);
  }
  const labels = await report(c.workspace.id, {
    measure: "throughput",
    slice: "label",
  });
  expect(labels.rows).toMatchObject([
    { key: "label:Bug", value: 1, points: 3 },
    { key: "label:Release", value: 2, points: 8 },
  ]);
  expect(JSON.stringify(labels)).not.toContain("Private label");
});

it("computes PostgreSQL median/p75 durations and omits missing history", async () => {
  const c = await insightsFixture();
  mockAuthenticatedSession(c.restricted);
  expect(
    (await report(c.workspace.id, { measure: "lead-time", slice: "project" }))
      .rows,
  ).toMatchObject([
    { series: "median", value: 10, points: null, samples: 2 },
    { series: "p75", value: 10.5, points: null, samples: 2 },
  ]);
  expect(
    (await report(c.workspace.id, { measure: "cycle-time", slice: "cycle" }))
      .rows,
  ).toMatchObject([
    { series: "median", value: 2.5 },
    { series: "p75", value: 2.75 },
  ]);
  expect(
    (
      await report(c.workspace.id, {
        measure: "time-to-triage",
        slice: "project",
      })
    ).rows,
  ).toMatchObject([
    { series: "median", value: 1, samples: 1 },
    { series: "p75", value: 1 },
  ]);
  await db
    .update(taskExtTable)
    .set({ startedAt: null })
    .where(eq(taskExtTable.taskId, c.alphaTask.id));
  invalidateInsights();
  const missing = await report(c.workspace.id, {
    measure: "cycle-time",
    slice: "project",
  });
  expect(missing.partialHistory).toBe(true);
  expect(missing.rows[0]).toMatchObject({ value: 3, samples: 1 });
});

it("reports created/completed series and current workload, excluding pending intake and canceled work", async () => {
  const c = await insightsFixture();
  mockAuthenticatedSession(c.restricted);
  const growth = await report(c.workspace.id, { measure: "created-completed" });
  expect(
    growth.rows
      .filter((row) => row.series === "created")
      .reduce((sum, row) => sum + row.value, 0),
  ).toBe(3);
  expect(
    growth.rows
      .filter((row) => row.series === "completed")
      .reduce((sum, row) => sum + row.value, 0),
  ).toBe(2);
  expect(
    (await report(c.workspace.id, { measure: "workload" })).rows,
  ).toMatchObject([{ key: "unassigned", value: 1, points: 1 }]);
  await db
    .update(schema.taskTable)
    .set({ status: "canceled", columnId: null })
    .where(eq(schema.taskTable.id, c.open.id));
  invalidateInsights();
  expect((await report(c.workspace.id, { measure: "workload" })).rows).toEqual(
    [],
  );
});

it("rechecks project visibility, archive state and permissions before serving a cached report", async () => {
  const c = await insightsFixture();
  mockAuthenticatedSession(c.restricted);
  expect(
    (await report(c.workspace.id, { measure: "throughput", slice: "project" }))
      .rows[0]?.points,
  ).toBe(8);
  await restrictToProjects(c.workspace.id, c.restricted.id, [c.beta.id]);
  expect(
    (await report(c.workspace.id, { measure: "throughput", slice: "project" }))
      .rows,
  ).toMatchObject([{ key: c.beta.id, points: 100 }]);
  await db
    .update(schema.projectTable)
    .set({ archivedAt: new Date() })
    .where(eq(schema.projectTable.id, c.beta.id));
  expect(
    (await report(c.workspace.id, { measure: "throughput", slice: "project" }))
      .rows,
  ).toEqual([]);
  const path = `/parity/insights/${c.workspace.id}?measure=throughput`;
  expect(
    (await projectAccessApi()(`${path}&projectId=${c.alpha.id}`)).status,
  ).toBe(404);
  mockAnonymousSession();
  expect((await projectAccessApi()(path)).status).toBe(401);
  mockAuthenticatedSession((await createWorkspaceMember()).user);
  expect((await projectAccessApi()(path)).status).toBe(404);
  mockAuthenticatedSession(c.owner);
  vi.stubEnv("PARITY_FEATURES", "cycles");
  expect((await projectAccessApi()(path)).status).toBe(404);
});

it("validates measure combinations and applies read-only API-key permissions", async () => {
  const c = await insightsFixture();
  mockAuthenticatedSession(c.restricted);
  const path = `/parity/insights/${c.workspace.id}`;
  for (const query of [
    "measure=unknown",
    "measure=throughput&typo=true",
    "measure=velocity&assigneeId=user",
    "measure=burndown",
    "measure=time-in-state&slice=week",
    "measure=throughput&from=2026-11-13&to=2026-11-01",
  ]) {
    expect((await projectAccessApi()(`${path}?${query}`)).status).toBe(400);
  }
  const key = `insights-test-${c.restricted.id}`.padEnd(64, "x");
  const [apiKey] = await db
    .insert(schema.apikeyTable)
    .values({
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
    })
    .returning();
  mockAnonymousSession();
  const request = projectAccessApi({ "x-api-key": key });
  const response = await request(`${path}?measure=throughput&slice=project`);
  expect(response.status).toBe(200);
  expect(
    insightsSchema.parse(await response.json()).rows.map((row) => row.key),
  ).toEqual([c.alpha.id]);
  await db
    .update(schema.apikeyTable)
    .set({
      permissions: JSON.stringify({ workspace: ["read"], project: ["read"] }),
    })
    .where(eq(schema.apikeyTable.id, apiKey!.id));
  expect(
    (await request(`${path}?measure=throughput&slice=project`)).status,
  ).toBe(403);
});

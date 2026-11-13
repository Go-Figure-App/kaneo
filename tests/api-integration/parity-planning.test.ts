import { createHash } from "node:crypto";
import { and, eq } from "drizzle-orm";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vite-plus/test";
import db, { schema } from "../../apps/api/src/database";
import {
  columnExtTable,
  initiativeProjectTable,
  initiativeTable,
  projectExtTable,
  projectMilestoneTable,
  statusUpdateTable,
  taskExtTable,
  workspaceExtTable,
} from "../../apps/api/src/database/schema-parity";
import * as events from "../../apps/api/src/events";
import { publishEvent } from "../../apps/api/src/events";
import * as workspacePermissions from "../../apps/api/src/utils/require-workspace-permission";
import {
  initializePlanning,
  reconcilePlanningProject,
  reconcileTaskMilestone,
} from "../../apps/api/src/parity/planning/initialize";
import {
  cleanOrphanUpdates,
  remindProjectLeads,
} from "../../apps/api/src/parity/planning/reminders";
import { mockAnonymousSession, mockAuthenticatedSession } from "./helpers/auth";
import { resetTestDatabase } from "./helpers/database";
import {
  createProjectFixture,
  createWorkspaceMember,
} from "./helpers/fixtures";
import { addWorkspaceMember } from "./helpers/project-access/add-workspace-member";
import { createRestrictedWorkspace } from "./helpers/project-access/create-restricted-workspace";
import { projectAccessApi } from "./helpers/project-access/project-access-api";

beforeEach(async () => {
  await resetTestDatabase();
  vi.stubEnv("PARITY_FEATURES", "projects,initiatives");
});
afterEach(() => vi.unstubAllEnvs());

async function setup() {
  const ctx = await createRestrictedWorkspace();
  mockAuthenticatedSession(ctx.owner);
  const request = projectAccessApi();
  const send = async (path: string, method = "GET", body?: unknown) => {
    const response = await request(`/parity/${path}`, { method, body });
    const result = await response.json();
    expect(response.status, JSON.stringify(result)).toBe(200);
    return result;
  };
  return { ...ctx, request, send };
}

it("returns defaults and updates plan fields without changing triage settings", async () => {
  const c = await setup();
  expect(await c.send(`project-plan/${c.alpha.id}`)).toMatchObject({
    status: "backlog",
    health: "on_track",
    leadId: null,
    startDate: null,
    milestones: [],
    progress: { total: 1, completed: 0, totalPoints: null },
  });
  await db.insert(projectExtTable).values({
    projectId: c.alpha.id,
    triageEnabled: true,
    intakeToken: "preserve-test-token",
  });
  expect(
    await c.send(`project-plan/${c.alpha.id}`, "PUT", {
      status: "started",
      leadId: c.owner.id,
      startDate: "2026-11-01",
      targetDate: "2026-12-01",
      priority: "high",
    }),
  ).toMatchObject({
    status: "started",
    leadId: c.owner.id,
    targetDate: "2026-12-01",
  });
  expect(
    (
      await db
        .select()
        .from(projectExtTable)
        .where(eq(projectExtTable.projectId, c.alpha.id))
    )[0],
  ).toMatchObject({ triageEnabled: true, intakeToken: "preserve-test-token" });
  expect(
    (
      await c.request(`/parity/project-plan/${c.alpha.id}`, {
        method: "PUT",
        body: { targetDate: "2026-10-01" },
      })
    ).status,
  ).toBe(400);
  expect(
    (
      await c.request(`/parity/project-plan/${c.alpha.id}`, {
        method: "PUT",
        body: { startDate: "2026-02-30" },
      })
    ).status,
  ).toBe(400);
  expect(
    await c.send(`project-plan/${c.alpha.id}`, "PUT", {
      leadId: null,
      startDate: null,
      targetDate: null,
    }),
  ).toMatchObject({ leadId: null, startDate: null, targetDate: null });
  const outsider = await createWorkspaceMember();
  expect(
    (
      await c.request(`/parity/project-plan/${c.alpha.id}`, {
        method: "PUT",
        body: { leadId: outsider.user.id },
      })
    ).status,
  ).toBe(403);
});

it("creates, edits, reorders and deletes milestones while retaining tasks", async () => {
  const c = await setup();
  const first = await c.send(`milestone/${c.alpha.id}`, "POST", {
    name: "First release",
    targetDate: "2026-12-15",
  });
  const second = await c.send(`milestone/${c.alpha.id}`, "POST", {
    name: "Second release",
  });
  expect(second.position).toBe(first.position + 1);
  await c.send(`milestone/item/${second.id}`, "PUT", {
    position: 0,
    description: "## Ready\n\n- [ ] Verify",
  });
  await c.send(`milestone/item/${first.id}`, "PUT", {
    position: 1,
    targetDate: null,
  });
  expect(
    (await c.send(`milestone/${c.alpha.id}`)).map(
      (row: { id: string }) => row.id,
    ),
  ).toEqual([second.id, first.id]);
  expect(
    await c.send(`task/${c.alphaTask.id}/milestone`, "PUT", {
      milestoneId: first.id,
    }),
  ).toMatchObject({ milestoneId: first.id, name: "First release" });
  expect(await c.send(`task/${c.alphaTask.id}/milestone`)).toMatchObject({
    milestoneId: first.id,
  });
  expect(
    (await c.send(`project-plan/${c.alpha.id}`)).milestones.find(
      (row: { id: string }) => row.id === first.id,
    ).progress.total,
  ).toBe(1);
  expect(
    (
      await c.request(`/parity/task/${c.betaTask.id}/milestone`, {
        method: "PUT",
        body: { milestoneId: first.id },
      })
    ).status,
  ).toBe(400);
  await c.send(`task/${c.alphaTask.id}/milestone`, "PUT", {
    milestoneId: null,
  });
  await c.send(`task/${c.alphaTask.id}/milestone`, "PUT", {
    milestoneId: first.id,
  });
  await c.send(`milestone/item/${first.id}`, "DELETE");
  expect(await c.send(`task/${c.alphaTask.id}/milestone`)).toMatchObject({
    milestoneId: null,
  });
  expect(
    await db
      .select()
      .from(schema.taskTable)
      .where(eq(schema.taskTable.id, c.alphaTask.id)),
  ).toHaveLength(1);
  expect(
    await db
      .select()
      .from(schema.activityTable)
      .where(
        and(
          eq(schema.activityTable.taskId, c.alphaTask.id),
          eq(schema.activityTable.type, "milestone_changed"),
        ),
      ),
  ).toHaveLength(3);
});

it("computes counts and points from categories while excluding pending and canceled tasks", async () => {
  const c = await setup();
  const columns = await db
    .select()
    .from(schema.columnTable)
    .where(eq(schema.columnTable.projectId, c.alpha.id));
  const done = columns.find((row) => row.slug === "done")!;
  const canceled = columns.find((row) => row.slug === "in-review")!;
  await db
    .insert(columnExtTable)
    .values({ columnId: canceled.id, category: "canceled" });
  await db
    .update(schema.taskTable)
    .set({ status: "done", columnId: done.id })
    .where(eq(schema.taskTable.id, c.alphaTask.id));
  const [open, pending, ignored] = await db
    .insert(schema.taskTable)
    .values([
      {
        projectId: c.alpha.id,
        title: "Unestimated open",
        number: 2,
        status: "to-do",
        columnId: columns.find((row) => row.slug === "to-do")!.id,
      },
      {
        projectId: c.alpha.id,
        title: "Pending completed",
        number: 3,
        status: "done",
        columnId: done.id,
      },
      {
        projectId: c.alpha.id,
        title: "Canceled",
        number: 4,
        status: canceled.slug,
        columnId: canceled.id,
      },
    ])
    .returning();
  await db.insert(taskExtTable).values([
    { taskId: c.alphaTask.id, estimate: 8 },
    { taskId: pending.id, estimate: 100, triageState: "pending" },
    { taskId: ignored.id, estimate: 100 },
  ]);
  await db
    .insert(workspaceExtTable)
    .values({ workspaceId: c.workspace.id, estimateScale: "fibonacci" });
  expect((await c.send(`project-plan/${c.alpha.id}`)).progress).toEqual({
    completed: 1,
    total: 2,
    percent: 50,
    completedPoints: 8,
    totalPoints: 9,
    pointsPercent: 88.89,
  });
  const milestone = await c.send(`milestone/${c.alpha.id}`, "POST", {
    name: "Delivery",
  });
  await c.send(`task/${c.alphaTask.id}/milestone`, "PUT", {
    milestoneId: milestone.id,
  });
  await c.send(`task/${open.id}/milestone`, "PUT", {
    milestoneId: milestone.id,
  });
  expect(
    (await c.send(`milestone/${c.alpha.id}`))[0].progress.totalPoints,
  ).toBe(9);
});

it("keeps hidden projects out of project lists, initiatives and rolled-up progress", async () => {
  const c = await setup();
  const initiative = await c.send(`initiative/${c.workspace.id}`, "POST", {
    name: "Launch",
    ownerId: c.owner.id,
  });
  for (const project of [c.alpha, c.beta])
    await c.send(
      `initiative/item/${initiative.id}/project/${project.id}`,
      "POST",
      {},
    );
  expect(
    (await c.send(`initiative/item/${initiative.id}`)).progress.total,
  ).toBe(2);
  mockAuthenticatedSession(c.restricted);
  const detail = await c.send(`initiative/item/${initiative.id}`);
  expect(detail.projects.map((project: { id: string }) => project.id)).toEqual([
    c.alpha.id,
  ]);
  expect(detail).toMatchObject({ projectCount: 1, progress: { total: 1 } });
  expect((await c.send(`initiative/${c.workspace.id}`)).items[0]).toMatchObject(
    { projectCount: 1, progress: { total: 1 } },
  );
  expect(
    (await c.send(`project-plan/workspace/${c.workspace.id}`)).items.map(
      (project: { id: string }) => project.id,
    ),
  ).toEqual([c.alpha.id]);
  for (const path of [
    `project-plan/${c.beta.id}`,
    `milestone/${c.beta.id}`,
    `task/${c.betaTask.id}/milestone`,
    `status-update/project/${c.beta.id}`,
  ])
    expect((await c.request(`/parity/${path}`)).status).toBe(403);
  expect(
    (
      await c.request(
        `/parity/initiative/item/${initiative.id}/project/${c.beta.id}`,
        { method: "DELETE" },
      )
    ).status,
  ).toBe(403);
});

it("supports multiple initiatives per project, linking, unlinking and stable ordering", async () => {
  const c = await setup();
  const first = await c.send(`initiative/${c.workspace.id}`, "POST", {
    name: "First",
    color: "#336699",
  });
  const second = await c.send(`initiative/${c.workspace.id}`, "POST", {
    name: "Second",
  });
  for (const initiative of [first, second])
    await c.send(
      `initiative/item/${initiative.id}/project/${c.alpha.id}`,
      "POST",
      {},
    );
  await c.send(`initiative/item/${first.id}/project/${c.alpha.id}`, "POST", {});
  expect(await db.select().from(initiativeProjectTable)).toHaveLength(2);
  await c.send(`initiative/${c.workspace.id}/reorder`, "POST", {
    ids: [second.id, first.id],
  });
  expect(
    (await c.send(`initiative/${c.workspace.id}`)).items.map(
      (row: { id: string }) => row.id,
    ),
  ).toEqual([second.id, first.id]);
  expect(
    (
      await c.request(`/parity/initiative/${c.workspace.id}/reorder`, {
        method: "POST",
        body: { ids: [first.id, first.id] },
      })
    ).status,
  ).toBe(409);
  const outsider = await createWorkspaceMember();
  const outside = await createProjectFixture({
    workspaceId: outsider.workspace.id,
  });
  expect(
    (
      await c.request(
        `/parity/initiative/item/${first.id}/project/${outside.project.id}`,
        { method: "POST", body: {} },
      )
    ).status,
  ).toBe(404);
  await c.send(`initiative/item/${first.id}/project/${c.alpha.id}`, "DELETE");
  expect((await c.send(`initiative/item/${first.id}`)).projectCount).toBe(0);
  expect((await c.send(`initiative/item/${second.id}`)).projectCount).toBe(1);
});

it("posts markdown updates, keeps health current, pages feeds and rejects missing parents", async () => {
  const c = await setup();
  const initiative = await c.send(`initiative/${c.workspace.id}`, "POST", {
    name: "Delivery",
  });
  for (const [kind, id] of [
    ["project", c.alpha.id],
    ["initiative", initiative.id],
  ]) {
    await c.send(`status-update/${kind}/${id}`, "POST", {
      health: "at_risk",
      body: "## Risks\n\n- Waiting for feedback",
    });
    const latest = await c.send(`status-update/${kind}/${id}`, "POST", {
      health: "on_track",
      body: "Resolved **all blockers**.",
    });
    const feed = await c.send(`status-update/${kind}/${id}?pageSize=1`);
    expect(feed).toMatchObject({
      hasMore: true,
      items: [{ id: latest.id, health: "on_track" }],
    });
    expect(
      (await c.send(`status-update/${kind}/${id}?pageSize=1&page=2`)).items[0]
        .body,
    ).toContain("## Risks");
  }
  expect(await c.send(`project-plan/${c.alpha.id}`)).toMatchObject({
    health: "on_track",
    latestUpdate: { body: "Resolved **all blockers**." },
  });
  expect(await c.send(`initiative/item/${initiative.id}`)).toMatchObject({
    health: "on_track",
    latestUpdate: { health: "on_track" },
  });
  expect(
    (
      await c.request("/parity/status-update/project/missing", {
        method: "POST",
        body: { health: "off_track", body: "No parent" },
      })
    ).status,
  ).toBe(404);
  expect(
    (
      await c.request(`/parity/status-update/project/${c.alpha.id}`, {
        method: "POST",
        body: { health: "off_track", body: " " },
      })
    ).status,
  ).toBe(400);
});

it("archives and restores initiatives without losing projects, then deletes only initiative data", async () => {
  const c = await setup();
  const initiative = await c.send(`initiative/${c.workspace.id}`, "POST", {
    name: "Archive me",
  });
  await c.send(
    `initiative/item/${initiative.id}/project/${c.alpha.id}`,
    "POST",
    {},
  );
  await c.send(`status-update/initiative/${initiative.id}`, "POST", {
    body: "History",
    health: "at_risk",
  });
  await c.send(`initiative/item/${initiative.id}`, "PUT", { archived: true });
  expect((await c.send(`initiative/${c.workspace.id}`)).items).toEqual([]);
  expect(
    (await c.send(`initiative/${c.workspace.id}?includeArchived=true`)).items,
  ).toHaveLength(1);
  expect(
    (
      await c.request(`/parity/status-update/initiative/${initiative.id}`, {
        method: "POST",
        body: { body: "Blocked", health: "on_track" },
      })
    ).status,
  ).toBe(409);
  await c.send(`initiative/item/${initiative.id}`, "PUT", {
    archived: false,
    name: "Restored",
    ownerId: null,
    targetDate: null,
    status: "active",
  });
  expect((await c.send(`initiative/item/${initiative.id}`)).projectCount).toBe(
    1,
  );
  await c.send(`initiative/item/${initiative.id}`, "DELETE");
  expect(await db.select().from(statusUpdateTable)).toHaveLength(0);
  expect(await db.select().from(initiativeProjectTable)).toHaveLength(0);
  expect(
    await db
      .select()
      .from(schema.projectTable)
      .where(eq(schema.projectTable.id, c.alpha.id)),
  ).toHaveLength(1);
});

it("enforces viewer writes, member archive permission, workspace membership and feature flags", async () => {
  const c = await setup();
  const initiative = await c.send(`initiative/${c.workspace.id}`, "POST", {
    name: "Protected",
  });
  const milestone = await c.send(`milestone/${c.alpha.id}`, "POST", {
    name: "Protected",
  });
  const viewer = await addWorkspaceMember(c.workspace.id, "viewer");
  mockAuthenticatedSession(viewer);
  const writes: [string, string, object?][] = [
    [`project-plan/${c.alpha.id}`, "PUT", { status: "started" }],
    [`milestone/${c.alpha.id}`, "POST", { name: "Denied" }],
    [`milestone/item/${milestone.id}`, "PUT", { name: "Denied" }],
    [`milestone/item/${milestone.id}`, "DELETE"],
    [`task/${c.alphaTask.id}/milestone`, "PUT", { milestoneId: milestone.id }],
    [`initiative/${c.workspace.id}`, "POST", { name: "Denied" }],
    [`initiative/item/${initiative.id}`, "PUT", { name: "Denied" }],
    [`initiative/item/${initiative.id}`, "DELETE"],
    [`initiative/item/${initiative.id}/project/${c.alpha.id}`, "POST", {}],
    [`initiative/item/${initiative.id}/project/${c.alpha.id}`, "DELETE"],
    [`initiative/${c.workspace.id}/reorder`, "POST", { ids: [initiative.id] }],
    [
      `status-update/project/${c.alpha.id}`,
      "POST",
      { body: "Denied", health: "on_track" },
    ],
    [
      `status-update/initiative/${initiative.id}`,
      "POST",
      { body: "Denied", health: "on_track" },
    ],
  ];
  for (const [path, method, body] of writes)
    expect(
      (await c.request(`/parity/${path}`, { method, body })).status,
      path,
    ).toBe(403);
  mockAuthenticatedSession(c.restricted);
  expect(
    (
      await c.request(`/parity/initiative/item/${initiative.id}`, {
        method: "PUT",
        body: { archived: true },
      })
    ).status,
  ).toBe(403);
  const outsider = await createWorkspaceMember();
  mockAuthenticatedSession(outsider.user);
  for (const path of [
    `project-plan/${c.alpha.id}`,
    `project-plan/workspace/${c.workspace.id}`,
    `initiative/${c.workspace.id}`,
    `initiative/item/${initiative.id}`,
    `milestone/${c.alpha.id}`,
    `status-update/initiative/${initiative.id}`,
  ])
    expect((await c.request(`/parity/${path}`)).status, path).toBe(404);
  mockAuthenticatedSession(c.owner);
  vi.stubEnv("PARITY_FEATURES", "foundation");
  for (const path of [
    `project-plan/${c.alpha.id}`,
    `initiative/${c.workspace.id}`,
    `milestone/${c.alpha.id}`,
    `task/${c.alphaTask.id}/milestone`,
    `status-update/project/${c.alpha.id}`,
  ])
    expect((await c.request(`/parity/${path}`)).status).toBe(404);
  mockAnonymousSession();
  expect((await c.request(`/parity/project-plan/${c.alpha.id}`)).status).toBe(
    401,
  );
});

it("hides stale cross-workspace links immediately and reconciles project and task moves", async () => {
  const c = await setup();
  const milestone = await c.send(`milestone/${c.alpha.id}`, "POST", {
    name: "Alpha only",
  });
  await c.send(`task/${c.alphaTask.id}/milestone`, "PUT", {
    milestoneId: milestone.id,
  });
  await db
    .update(schema.taskTable)
    .set({ projectId: c.beta.id, columnId: c.betaTask.columnId, number: 2 })
    .where(eq(schema.taskTable.id, c.alphaTask.id));
  expect(await c.send(`task/${c.alphaTask.id}/milestone`)).toMatchObject({
    milestoneId: null,
  });
  await reconcileTaskMilestone(c.alphaTask.id);
  expect(
    (
      await db
        .select()
        .from(taskExtTable)
        .where(eq(taskExtTable.taskId, c.alphaTask.id))
    )[0].milestoneId,
  ).toBeNull();
  const initiative = await c.send(`initiative/${c.workspace.id}`, "POST", {
    name: "Private membership",
  });
  await c.send(
    `initiative/item/${initiative.id}/project/${c.alpha.id}`,
    "POST",
    {},
  );
  await c.send(`project-plan/${c.alpha.id}`, "PUT", { leadId: c.owner.id });
  const outside = await createWorkspaceMember();
  await db
    .update(schema.projectTable)
    .set({ workspaceId: outside.workspace.id })
    .where(eq(schema.projectTable.id, c.alpha.id));
  expect((await c.send(`initiative/item/${initiative.id}`)).projects).toEqual(
    [],
  );
  const publish = vi.spyOn(events, "publishEvent");
  try {
    await reconcilePlanningProject(c.alpha.id);
    expect(publish.mock.calls).toEqual([
      [
        "parity.workspace_updated",
        {
          type: "PROJECT_PLAN_UPDATED",
          workspaceId: outside.workspace.id,
          projectId: c.alpha.id,
        },
      ],
      [
        "parity.workspace_updated",
        { type: "INITIATIVE_UPDATED", workspaceId: c.workspace.id },
      ],
    ]);
  } finally {
    publish.mockRestore();
  }
  expect(await db.select().from(initiativeProjectTable)).toHaveLength(0);
  expect(
    (
      await db
        .select()
        .from(projectExtTable)
        .where(eq(projectExtTable.projectId, c.alpha.id))
    )[0].leadId,
  ).toBeNull();
});

it("reconciles task milestone changes through the event bus", async () => {
  const c = await setup();
  await initializePlanning();
  const [milestone] = await db
    .insert(projectMilestoneTable)
    .values({ projectId: c.alpha.id, name: "Old project" })
    .returning();
  await db
    .insert(taskExtTable)
    .values({ taskId: c.betaTask.id, milestoneId: milestone.id });
  await publishEvent("task.moved", {
    taskId: c.betaTask.id,
    fromProjectId: c.alpha.id,
    toProjectId: c.beta.id,
  });
  await vi.waitFor(async () =>
    expect(
      (
        await db
          .select()
          .from(taskExtTable)
          .where(eq(taskExtTable.taskId, c.betaTask.id))
      )[0].milestoneId,
    ).toBeNull(),
  );
});

it("counts legacy tasks that identify their column by status", async () => {
  const c = await setup();
  await db
    .update(schema.taskTable)
    .set({ columnId: null, status: "done" })
    .where(eq(schema.taskTable.id, c.alphaTask.id));
  expect((await c.send(`project-plan/${c.alpha.id}`)).progress).toMatchObject({
    completed: 1,
    total: 1,
    percent: 100,
  });
});

it("keeps the latest update and health in step under concurrent posting", async () => {
  const c = await setup();
  await Promise.all([
    c.send(`status-update/project/${c.alpha.id}`, "POST", {
      health: "at_risk",
      body: "First review",
    }),
    c.send(`status-update/project/${c.alpha.id}`, "POST", {
      health: "off_track",
      body: "Second review",
    }),
  ]);
  const plan = await c.send(`project-plan/${c.alpha.id}`);
  const feed = await c.send(`status-update/project/${c.alpha.id}`);
  expect(plan.health).toBe(feed.items[0].health);
  expect(plan.latestUpdate.id).toBe(feed.items[0].id);
  expect(feed.items).toHaveLength(2);
});

it("checks hidden-project write access even when a custom role can edit planning", async () => {
  const c = await setup();
  const initiative = await c.send(`initiative/${c.workspace.id}`, "POST", {
    name: "Scoped planning",
  });
  const milestone = await c.send(`milestone/${c.beta.id}`, "POST", {
    name: "Hidden milestone",
  });
  await db.insert(schema.workspaceRoleTable).values({
    workspaceId: c.workspace.id,
    role: "member",
    permission: JSON.stringify({
      workspace: ["read"],
      project: ["read", "update"],
      task: ["read", "update"],
    }),
  });
  mockAuthenticatedSession(c.restricted);
  expect(
    (
      await c.request(
        `/parity/initiative/item/${initiative.id}/project/${c.beta.id}`,
        { method: "POST", body: {} },
      )
    ).status,
  ).toBe(404);
  expect(
    (
      await c.request(`/parity/milestone/item/${milestone.id}`, {
        method: "PUT",
        body: { name: "Denied" },
      })
    ).status,
  ).toBe(403);
  expect(
    (
      await c.request(`/parity/task/${c.betaTask.id}/milestone`, {
        method: "PUT",
        body: { milestoneId: null },
      })
    ).status,
  ).toBe(403);
  expect(
    (
      await c.request(`/parity/project-plan/${c.beta.id}`, {
        method: "PUT",
        body: { status: "started" },
      })
    ).status,
  ).toBe(403);
  expect(
    await c.send(`project-plan/${c.alpha.id}`, "PUT", { status: "started" }),
  ).toMatchObject({ status: "started" });
});

it("honors API-key scopes even when the key owner can manage the workspace", async () => {
  const c = await setup();
  const initiative = await c.send(`initiative/${c.workspace.id}`, "POST", {
    name: "Key scope",
  });
  const key = `planning-test-${c.owner.id}`.padEnd(64, "x");
  await db.insert(schema.apikeyTable).values({
    referenceId: c.owner.id,
    userId: c.owner.id,
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
  const request = projectAccessApi({ "x-api-key": key });
  expect((await request(`/parity/project-plan/${c.alpha.id}`)).status).toBe(
    200,
  );
  expect(
    (await request(`/parity/initiative/item/${initiative.id}`)).status,
  ).toBe(200);
  expect(
    (
      await request(`/parity/project-plan/${c.alpha.id}`, {
        method: "PUT",
        body: { status: "started" },
      })
    ).status,
  ).toBe(403);
  expect(
    (
      await request(`/parity/initiative/${c.workspace.id}`, {
        method: "POST",
        body: { name: "Denied" },
      })
    ).status,
  ).toBe(403);
  expect(
    (
      await request(`/parity/status-update/initiative/${initiative.id}`, {
        method: "POST",
        body: { body: "Denied", health: "on_track" },
      })
    ).status,
  ).toBe(403);
});

describe("planning maintenance", () => {
  it("deduplicates weekly reminders across due projects and concurrent ticks", async () => {
    const c = await setup();
    const now = new Date("2026-12-01T12:00:00Z");
    await db
      .update(schema.projectTable)
      .set({ createdAt: new Date("2026-11-01T00:00:00Z") });
    await db.insert(projectExtTable).values([
      { projectId: c.alpha.id, leadId: c.owner.id, status: "started" },
      { projectId: c.beta.id, leadId: c.owner.id, status: "planned" },
    ]);
    await Promise.all([remindProjectLeads(now), remindProjectLeads(now)]);
    await remindProjectLeads(new Date("2026-12-02T12:00:00Z"));
    let notifications = await db
      .select()
      .from(schema.notificationTable)
      .where(eq(schema.notificationTable.type, "project_update_reminder"));
    expect(notifications).toHaveLength(1);
    expect(notifications[0]).toMatchObject({
      userId: c.owner.id,
      resourceType: "workspace",
      resourceId: c.workspace.id,
    });
    expect(JSON.stringify(notifications[0])).not.toContain(c.alpha.name);
    await remindProjectLeads(new Date("2026-12-09T12:00:00Z"));
    notifications = await db
      .select()
      .from(schema.notificationTable)
      .where(eq(schema.notificationTable.type, "project_update_reminder"));
    expect(notifications).toHaveLength(2);
  });

  it("skips recent updates and inaccessible projects and removes only orphan updates", async () => {
    const c = await setup();
    const now = new Date("2026-12-01T12:00:00Z");
    await db
      .update(schema.projectTable)
      .set({ createdAt: new Date("2026-11-01T00:00:00Z") });
    await db.insert(projectExtTable).values([
      { projectId: c.alpha.id, leadId: c.owner.id, status: "started" },
      { projectId: c.beta.id, leadId: c.restricted.id, status: "started" },
    ]);
    await db.insert(statusUpdateTable).values([
      {
        parentType: "project",
        parentId: c.alpha.id,
        authorId: c.owner.id,
        body: "Recent",
        health: "on_track",
        createdAt: new Date("2026-11-30T12:00:00Z"),
      },
      {
        parentType: "project",
        parentId: "deleted-project",
        body: "Orphan",
        health: "on_track",
      },
    ]);
    await remindProjectLeads(now);
    expect(
      await db
        .select()
        .from(schema.notificationTable)
        .where(eq(schema.notificationTable.type, "project_update_reminder")),
    ).toHaveLength(0);
    await cleanOrphanUpdates();
    expect(
      (await db.select().from(statusUpdateTable)).map((row) => row.body),
    ).toEqual(["Recent"]);
    expect(await db.select().from(initiativeTable)).toHaveLength(0);
  });
});

it("preserves descriptions on partial edits and archive/restore while allowing explicit clearing", async () => {
  const c = await setup();
  const description = "## Preserve this planning context";
  const milestone = await c.send(`milestone/${c.alpha.id}`, "POST", {
    name: "Release",
    description,
  });
  for (const patch of [
    { name: "Renamed" },
    { targetDate: "2026-12-10" },
    { position: 3 },
  ]) {
    expect(
      await c.send(`milestone/item/${milestone.id}`, "PUT", patch),
    ).toMatchObject({ description });
  }
  expect(
    await c.send(`milestone/item/${milestone.id}`, "PUT", { description: "" }),
  ).toMatchObject({ description: "" });
  const initiative = await c.send(`initiative/${c.workspace.id}`, "POST", {
    name: "Launch",
    description,
  });
  for (const patch of [
    { name: "Renamed launch" },
    { ownerId: c.owner.id },
    { targetDate: "2026-12-10" },
    { archived: true },
    { archived: false },
  ]) {
    expect(
      await c.send(`initiative/item/${initiative.id}`, "PUT", patch),
    ).toMatchObject({ description });
  }
  expect(
    await c.send(`initiative/item/${initiative.id}`, "PUT", {
      description: "",
    }),
  ).toMatchObject({ description: "" });
});

it("pages past more than 500 denied leads and reuses role checks within the tick", async () => {
  const c = await setup();
  const now = new Date("2026-12-01T12:00:00Z");
  const ids = [
    ...Array.from(
      { length: 501 },
      (_, i) => `000-denied-${String(i).padStart(4, "0")}`,
    ),
    "zzz-eligible",
  ];
  await db
    .insert(schema.userTable)
    .values(ids.map((id) => ({ id, name: id, email: `${id}@example.test` })));
  await db.insert(schema.workspaceUserTable).values(
    ids.map((userId) => ({
      userId,
      workspaceId: c.workspace.id,
      role: userId === "zzz-eligible" ? "owner" : "viewer",
      joinedAt: now,
    })),
  );
  await db.insert(schema.projectTable).values(
    ids.map((id) => ({
      id: `due-${id}`,
      name: "Due project",
      slug: `due-${id}`,
      workspaceId: c.workspace.id,
      createdAt: new Date("2026-11-01T00:00:00Z"),
    })),
  );
  await db.insert(projectExtTable).values(
    ids.map((leadId) => ({
      projectId: `due-${leadId}`,
      leadId,
      status: "started" as const,
    })),
  );
  const permission = vi.spyOn(
    workspacePermissions,
    "roleHasWorkspacePermission",
  );
  try {
    expect(await remindProjectLeads(now)).toEqual({ reminded: 1 });
    expect(permission).toHaveBeenCalledTimes(2);
  } finally {
    permission.mockRestore();
  }
  const notifications = await db
    .select()
    .from(schema.notificationTable)
    .where(eq(schema.notificationTable.type, "project_update_reminder"));
  expect(notifications).toHaveLength(1);
  expect(notifications[0].userId).toBe("zzz-eligible");
});

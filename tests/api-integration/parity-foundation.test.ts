import { resolve } from "node:path";
import { and, eq } from "drizzle-orm";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vite-plus/test";
import db, { getDatabase, schema } from "../../apps/api/src/database";
import {
  columnExtTable,
  taskExtTable,
} from "../../apps/api/src/database/schema-parity";
import { migrateParity } from "../../apps/api/src/parity/foundation/migrate";
import { seedCategories } from "../../apps/api/src/parity/foundation/controllers/columns";
import {
  backfillLifecycle,
  syncLifecycle,
} from "../../apps/api/src/parity/foundation/controllers/sync-lifecycle";
import { broadcastWorkspaceEvent } from "../../apps/api/src/parity/foundation/workspace-events";
import { addUserConnection, removeUserConnection } from "../../apps/api/src/ws";
import { initializeParity } from "../../apps/api/src/parity/foundation/initialize";
import updateTaskStatus from "../../apps/api/src/task/controllers/update-task-status";
import { mockAnonymousSession, mockAuthenticatedSession } from "./helpers/auth";
import { resetTestDatabase } from "./helpers/database";
import {
  createProjectFixture,
  createWorkspaceMember,
} from "./helpers/fixtures";
import { createRestrictedWorkspace } from "./helpers/project-access/create-restricted-workspace";
import { projectAccessApi } from "./helpers/project-access/project-access-api";

beforeEach(async () => {
  await resetTestDatabase();
  await migrateParity(
    getDatabase(),
    resolve(import.meta.dirname, "../../apps/api/drizzle-parity"),
  );
  vi.stubEnv("PARITY_FEATURES", "foundation");
});
afterEach(() => vi.unstubAllEnvs());

it("tracks real task mutations through the event bus and clears terminal timestamps on reopen", async () => {
  const ctx = await createRestrictedWorkspace();
  await initializeParity();
  await updateTaskStatus({
    id: ctx.alphaTask.id,
    status: "in-progress",
    currentUserId: ctx.owner.id,
  });
  const extension = async () =>
    (
      await db
        .select()
        .from(taskExtTable)
        .where(eq(taskExtTable.taskId, ctx.alphaTask.id))
    )[0];
  await vi.waitFor(async () =>
    expect((await extension())?.startedAt).toBeInstanceOf(Date),
  );
  const started = (await extension())?.startedAt;
  await updateTaskStatus({
    id: ctx.alphaTask.id,
    status: "done",
    currentUserId: ctx.owner.id,
  });
  await vi.waitFor(async () =>
    expect((await extension())?.completedAt).toBeInstanceOf(Date),
  );
  await updateTaskStatus({
    id: ctx.alphaTask.id,
    status: "to-do",
    currentUserId: ctx.owner.id,
  });
  await vi.waitFor(async () =>
    expect((await extension())?.completedAt).toBeNull(),
  );
  expect((await extension())?.startedAt).toEqual(started);
});

describe("parity foundation routes", () => {
  it("requires authentication for feature discovery and defaults off", async () => {
    mockAnonymousSession();
    expect((await projectAccessApi()("/parity/features")).status).toBe(401);
    const { user } = await createWorkspaceMember();
    mockAuthenticatedSession(user);
    vi.stubEnv("PARITY_FEATURES", "");
    expect(await (await projectAccessApi()("/parity/features")).json()).toEqual(
      { features: [] },
    );
    expect((await projectAccessApi()("/parity/columns/missing")).status).toBe(
      404,
    );
  });
  it("reads defaults, persists categories and leaves upstream final flags unchanged", async () => {
    const { user, workspace } = await createWorkspaceMember({ role: "owner" });
    const { project, columns } = await createProjectFixture({
      workspaceId: workspace.id,
    });
    mockAuthenticatedSession(user);
    const request = projectAccessApi();
    const response = await request(`/parity/columns/${project.id}`);
    expect(response.status).toBe(200);
    expect(await response.json()).toContainEqual(
      expect.objectContaining({ id: columns.done.id, category: "completed" }),
    );
    expect(
      (
        await request(`/parity/columns/${project.id}/${columns.done.id}`, {
          method: "PUT",
          body: { category: "canceled" },
        })
      ).status,
    ).toBe(200);
    await seedCategories();
    expect(
      (
        await db
          .select()
          .from(columnExtTable)
          .where(eq(columnExtTable.columnId, columns.done.id))
      )[0].category,
    ).toBe("canceled");
    expect(
      (
        await db.query.columnTable.findFirst({
          where: eq(schema.columnTable.id, columns.done.id),
        })
      )?.isFinal,
    ).toBe(true);
    expect(
      (
        await request(`/parity/columns/${project.id}/${columns.done.id}`, {
          method: "PUT",
          body: { category: "invalid" },
        })
      ).status,
    ).toBe(400);
  });
  it("denies viewers permission to edit", async () => {
    const { user, workspace } = await createWorkspaceMember({ role: "viewer" });
    const { project, columns } = await createProjectFixture({
      workspaceId: workspace.id,
    });
    mockAuthenticatedSession(user);
    expect(
      (
        await projectAccessApi()(
          `/parity/columns/${project.id}/${columns.todo.id}`,
          { method: "PUT", body: { category: "started" } },
        )
      ).status,
    ).toBe(403);
  });
  it("never reads or mutates hidden projects, including a column smuggled under a visible project", async () => {
    const ctx = await createRestrictedWorkspace();
    const [hidden] = await db
      .select()
      .from(schema.columnTable)
      .where(eq(schema.columnTable.projectId, ctx.beta.id));
    mockAuthenticatedSession(ctx.restricted);
    const request = projectAccessApi();
    expect((await request(`/parity/columns/${ctx.alpha.id}`)).status).toBe(200);
    expect((await request(`/parity/columns/${ctx.beta.id}`)).status).toBe(403);
    expect(
      (
        await request(`/parity/columns/${ctx.beta.id}/${hidden.id}`, {
          method: "PUT",
          body: { category: "started" },
        })
      ).status,
    ).toBe(403);
    expect(
      (
        await request(`/parity/columns/${ctx.alpha.id}/${hidden.id}`, {
          method: "PUT",
          body: { category: "started" },
        })
      ).status,
    ).toBe(403);
    mockAuthenticatedSession(ctx.owner);
    expect(
      (
        await request(`/parity/columns/${ctx.alpha.id}/${hidden.id}`, {
          method: "PUT",
          body: { category: "started" },
        })
      ).status,
    ).toBe(404);
    expect(await db.select().from(columnExtTable)).toHaveLength(0);
  });
});

it("backfills actual activity dates, is repeatable, and retains unrelated task extension fields", async () => {
  const ctx = await createRestrictedWorkspace();
  const [done] = await db
    .select()
    .from(schema.columnTable)
    .where(
      and(
        eq(schema.columnTable.projectId, ctx.alpha.id),
        eq(schema.columnTable.slug, "done"),
      ),
    );
  await db
    .update(schema.taskTable)
    .set({ status: "done", columnId: done.id })
    .where(eq(schema.taskTable.id, ctx.alphaTask.id));
  await db.insert(taskExtTable).values({
    taskId: ctx.alphaTask.id,
    estimate: 5,
    startedAt: new Date("2026-01-01T12:00:00Z"),
    completedAt: new Date("2026-01-01T18:00:00Z"),
  });
  const startedAt = new Date("2026-01-01T00:00:00Z");
  const completedAt = new Date("2026-01-02T00:00:00Z");
  await db.insert(schema.activityTable).values([
    {
      taskId: ctx.alphaTask.id,
      type: "status_changed",
      createdAt: startedAt,
      eventData: { oldStatus: "to-do", newStatus: "in-progress" },
    },
    {
      taskId: ctx.alphaTask.id,
      type: "status_changed",
      createdAt: completedAt,
      eventData: { oldStatus: "in-progress", newStatus: "done" },
    },
  ]);
  await backfillLifecycle();
  await backfillLifecycle();
  expect(
    (
      await db
        .select()
        .from(taskExtTable)
        .where(eq(taskExtTable.taskId, ctx.alphaTask.id))
    )[0],
  ).toMatchObject({ startedAt, completedAt, estimate: 5 });
  await db
    .update(schema.taskTable)
    .set({ status: "backlog", columnId: null })
    .where(eq(schema.taskTable.id, ctx.alphaTask.id));
  await syncLifecycle(ctx.alphaTask.id);
  expect(
    (
      await db
        .select()
        .from(taskExtTable)
        .where(eq(taskExtTable.taskId, ctx.alphaTask.id))
    )[0],
  ).toMatchObject({
    startedAt,
    completedAt: null,
    canceledAt: null,
    estimate: 5,
  });
});

it("retains rapid transitions when handlers arrive after the task advances and out of order", async () => {
  const { workspace } = await createWorkspaceMember({ role: "owner" });
  const { project, columns } = await createProjectFixture({
    workspaceId: workspace.id,
  });
  const [task] = await db
    .insert(schema.taskTable)
    .values({
      projectId: project.id,
      title: "Rapid transitions",
      status: "to-do",
      columnId: columns.todo.id,
      number: 1,
    })
    .returning();
  await db
    .update(schema.taskTable)
    .set({ status: "done", columnId: columns.done.id })
    .where(eq(schema.taskTable.id, task.id));
  const startedAt = new Date("2026-01-01T00:00:00Z");
  const firstCompletion = new Date("2026-01-02T00:00:00Z");
  const reopenedAt = new Date("2026-01-03T00:00:00Z");
  const completedAt = new Date("2026-01-04T00:00:00Z");
  const observe = (status: string, at: Date) =>
    syncLifecycle(task.id, { projectId: project.id, status, at });
  // Neither the intermediate row nor the asynchronous activity insert is
  // available when these delayed handlers run.
  await observe("done", firstCompletion);
  await observe("in-progress", startedAt);
  await observe("done", completedAt);
  await observe("in-progress", reopenedAt);
  const extension = async () =>
    (
      await db
        .select()
        .from(taskExtTable)
        .where(eq(taskExtTable.taskId, task.id))
    )[0];
  expect(await extension()).toMatchObject({
    startedAt,
    completedAt,
    canceledAt: null,
  });
  await db
    .update(schema.taskTable)
    .set({ status: "to-do", columnId: columns.todo.id })
    .where(eq(schema.taskTable.id, task.id));
  await observe("done", completedAt);
  expect(await extension()).toMatchObject({
    startedAt,
    completedAt: null,
    canceledAt: null,
  });
});

it("sends payload-free hints only to members allowed to read the affected project", async () => {
  const ctx = await createRestrictedWorkspace();
  const outsider = await createWorkspaceMember();
  const sockets = [ctx.owner, ctx.restricted, outsider.user].map((user) => {
    const ws = { send: vi.fn(), close: vi.fn() };
    const connection = addUserConnection(
      user.id,
      ws as Parameters<typeof addUserConnection>[1],
    );
    return { user, ws, connection };
  });
  try {
    await broadcastWorkspaceEvent({
      type: "PROJECT_PLAN_UPDATED",
      workspaceId: ctx.workspace.id,
      projectId: ctx.beta.id,
    });
    expect(sockets[0].ws.send).toHaveBeenCalledWith(
      JSON.stringify({
        type: "PROJECT_PLAN_UPDATED",
        workspaceId: ctx.workspace.id,
      }),
    );
    expect(sockets[1].ws.send).not.toHaveBeenCalled();
    expect(sockets[2].ws.send).not.toHaveBeenCalled();
    await db
      .delete(schema.workspaceUserTable)
      .where(
        and(
          eq(schema.workspaceUserTable.userId, ctx.owner.id),
          eq(schema.workspaceUserTable.workspaceId, ctx.workspace.id),
        ),
      );
    sockets[0].ws.send.mockClear();
    await broadcastWorkspaceEvent({
      type: "CYCLE_UPDATED",
      workspaceId: ctx.workspace.id,
    });
    expect(sockets[0].ws.send).not.toHaveBeenCalled();
  } finally {
    for (const { user, connection } of sockets)
      removeUserConnection(user.id, connection);
  }
});

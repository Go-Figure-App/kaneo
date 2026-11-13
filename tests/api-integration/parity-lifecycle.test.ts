import { resolve } from "node:path";
import { eq } from "drizzle-orm";
import { beforeEach, expect, it } from "vite-plus/test";
import db, { getDatabase, schema } from "../../apps/api/src/database";
import {
  columnExtTable,
  taskExtTable,
} from "../../apps/api/src/database/schema-parity";
import { syncLifecycle } from "../../apps/api/src/parity/foundation/controllers/sync-lifecycle";
import { migrateParity } from "../../apps/api/src/parity/foundation/migrate";
import { resetTestDatabase } from "./helpers/database";
import {
  createProjectFixture,
  createWorkspaceMember,
} from "./helpers/fixtures";

beforeEach(async () => {
  await resetTestDatabase();
  await migrateParity(
    getDatabase(),
    resolve(import.meta.dirname, "../../apps/api/drizzle-parity"),
  );
});

const extension = async (taskId: string) =>
  (
    await db.select().from(taskExtTable).where(eq(taskExtTable.taskId, taskId))
  )[0];

it("reconstructs project history across moves before interpreting custom status categories", async () => {
  const { workspace } = await createWorkspaceMember({ role: "owner" });
  const a = await createProjectFixture({ workspaceId: workspace.id });
  const b = await createProjectFixture({ workspaceId: workspace.id });
  const [workingA, workingB] = await db
    .insert(schema.columnTable)
    .values([
      {
        projectId: a.project.id,
        name: "Working",
        slug: "working",
        position: 4,
      },
      {
        projectId: b.project.id,
        name: "Working",
        slug: "working",
        position: 4,
      },
    ])
    .returning();
  await db.insert(columnExtTable).values([
    { columnId: workingA.id, category: "started" },
    { columnId: workingB.id, category: "unstarted" },
  ]);
  const [task] = await db
    .insert(schema.taskTable)
    .values({
      projectId: b.project.id,
      title: "Moved task",
      number: 1,
      status: "done",
      columnId: b.columns.done.id,
    })
    .returning();
  const dates = [1, 2, 3, 4, 5].map(
    (day) => new Date(`2026-01-0${day}T00:00:00Z`),
  );
  await db.insert(schema.activityTable).values([
    {
      taskId: task.id,
      type: "status_changed",
      createdAt: dates[0],
      eventData: { oldStatus: "to-do", newStatus: "working" },
    },
    {
      taskId: task.id,
      type: "moved",
      createdAt: dates[1],
      eventData: {
        fromProjectId: a.project.id,
        toProjectId: b.project.id,
        oldStatus: "working",
        newStatus: "working",
      },
    },
    {
      taskId: task.id,
      type: "status_changed",
      createdAt: dates[2],
      eventData: { oldStatus: "working", newStatus: "done" },
    },
    {
      taskId: task.id,
      type: "moved",
      createdAt: dates[3],
      eventData: {
        fromProjectId: b.project.id,
        toProjectId: a.project.id,
        oldStatus: "done",
        newStatus: "working",
      },
    },
    {
      taskId: task.id,
      type: "moved",
      createdAt: dates[4],
      eventData: {
        fromProjectId: a.project.id,
        toProjectId: b.project.id,
        oldStatus: "working",
        newStatus: "done",
      },
    },
  ]);
  await syncLifecycle(task.id);
  await syncLifecycle(task.id);
  expect(await extension(task.id)).toMatchObject({
    startedAt: dates[0],
    completedAt: dates[4],
    canceledAt: null,
  });
});

it("preserves terminal entry through same-category changes with delayed activities and handlers", async () => {
  const { workspace } = await createWorkspaceMember({ role: "owner" });
  const { project, columns } = await createProjectFixture({
    workspaceId: workspace.id,
  });
  const [verified] = await db
    .insert(schema.columnTable)
    .values({
      projectId: project.id,
      name: "Verified",
      slug: "verified",
      position: 4,
      isFinal: true,
    })
    .returning();
  const [task] = await db
    .insert(schema.taskTable)
    .values({
      projectId: project.id,
      title: "Verified task",
      number: 1,
      status: "verified",
      columnId: verified.id,
    })
    .returning();
  const first = new Date("2026-01-01T00:00:00Z");
  const second = new Date("2026-01-02T00:00:00Z");
  const third = new Date("2026-01-03T00:00:00Z");
  const observe = (status: string, previousStatus: string, at: Date) =>
    syncLifecycle(task.id, {
      projectId: project.id,
      status,
      previousStatus,
      at,
    });
  // The task has already advanced and neither activity is committed yet.
  await observe("done", "in-progress", first);
  await observe("verified", "done", second);
  expect((await extension(task.id)).completedAt).toEqual(first);

  // Delivery in reverse order must reach the same result.
  await db.delete(taskExtTable).where(eq(taskExtTable.taskId, task.id));
  await observe("verified", "done", second);
  expect((await extension(task.id)).completedAt).toBeNull();
  await observe("done", "in-progress", first);
  expect((await extension(task.id)).completedAt).toEqual(first);
  await db.insert(schema.activityTable).values([
    {
      taskId: task.id,
      type: "status_changed",
      createdAt: first,
      eventData: { oldStatus: "in-progress", newStatus: "done" },
    },
    {
      taskId: task.id,
      type: "status_changed",
      createdAt: second,
      eventData: { oldStatus: "done", newStatus: "verified" },
    },
  ]);
  await syncLifecycle(task.id);
  expect((await extension(task.id)).completedAt).toEqual(first);

  // A genuine re-entry still updates the date when its reopening activity is delayed.
  await db
    .update(schema.taskTable)
    .set({ status: "done", columnId: columns.done.id })
    .where(eq(schema.taskTable.id, task.id));
  await observe("done", "in-progress", third);
  await observe("verified", "done", second);
  expect((await extension(task.id)).completedAt).toEqual(third);
});

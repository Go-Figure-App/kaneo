import { and, eq } from "drizzle-orm";
import db, { schema } from "../../../apps/api/src/database";
import {
  cycleTable,
  taskExtTable,
  workspaceExtTable,
} from "../../../apps/api/src/database/schema-parity";
import { createRestrictedWorkspace } from "./project-access/create-restricted-workspace";

export async function insightsFixture() {
  const c = await createRestrictedWorkspace();
  await db.insert(workspaceExtTable).values({
    workspaceId: c.workspace.id,
    timeZone: "America/New_York",
    estimateScale: "fibonacci",
  });
  const [cycle] = await db
    .insert(cycleTable)
    .values({
      workspaceId: c.workspace.id,
      number: 1,
      startsAt: new Date("2026-11-09T05:00:00Z"),
      endsAt: new Date("2026-11-16T05:00:00Z"),
    })
    .returning();
  for (const task of [c.alphaTask, c.betaTask]) {
    const [done] = await db
      .select()
      .from(schema.columnTable)
      .where(
        and(
          eq(schema.columnTable.projectId, task.projectId),
          eq(schema.columnTable.slug, "done"),
        ),
      );
    await db
      .update(schema.taskTable)
      .set({
        status: "done",
        columnId: done!.id,
        createdAt: new Date("2026-11-01T12:00:00Z"),
      })
      .where(eq(schema.taskTable.id, task.id));
    await db.insert(taskExtTable).values({
      taskId: task.id,
      cycleId: cycle!.id,
      estimate: task.id === c.alphaTask.id ? 3 : 100,
      startedAt: new Date("2026-11-08T12:00:00Z"),
      completedAt: new Date("2026-11-10T12:00:00Z"),
    });
  }
  const [done] = await db
    .select()
    .from(schema.columnTable)
    .where(
      and(
        eq(schema.columnTable.projectId, c.alpha.id),
        eq(schema.columnTable.slug, "done"),
      ),
    );
  const [second] = await db
    .insert(schema.taskTable)
    .values({
      projectId: c.alpha.id,
      number: 2,
      title: "Another completed issue",
      status: "done",
      columnId: done!.id,
      userId: c.restricted.id,
      createdAt: new Date("2026-11-01T12:00:00Z"),
    })
    .returning();
  await db.insert(taskExtTable).values({
    taskId: second!.id,
    cycleId: cycle!.id,
    estimate: 5,
    startedAt: new Date("2026-11-09T12:00:00Z"),
    completedAt: new Date("2026-11-12T12:00:00Z"),
    triageState: "accepted",
    triagedAt: new Date("2026-11-02T12:00:00Z"),
  });
  const [open] = await db
    .insert(schema.taskTable)
    .values({
      projectId: c.alpha.id,
      number: 3,
      title: "Unestimated open issue",
      status: "to-do",
      createdAt: new Date("2026-11-01T12:00:00Z"),
    })
    .returning();
  const [pending] = await db
    .insert(schema.taskTable)
    .values({
      projectId: c.alpha.id,
      number: 4,
      title: "Pending intake",
      status: "to-do",
      createdAt: new Date("2026-11-01T12:00:00Z"),
    })
    .returning();
  await db
    .insert(taskExtTable)
    .values({ taskId: pending!.id, triageState: "pending", estimate: 8 });
  await db.insert(schema.labelTable).values([
    {
      taskId: c.alphaTask.id,
      workspaceId: c.workspace.id,
      name: "Bug",
      color: "#000000",
    },
    {
      taskId: c.alphaTask.id,
      workspaceId: c.workspace.id,
      name: "Release",
      color: "#000000",
    },
    {
      taskId: second!.id,
      workspaceId: c.workspace.id,
      name: "Release",
      color: "#000000",
    },
    {
      taskId: c.betaTask.id,
      workspaceId: c.workspace.id,
      name: "Private label",
      color: "#000000",
    },
  ]);
  return {
    ...c,
    cycle: cycle!,
    second: second!,
    open: open!,
    pending: pending!,
  };
}

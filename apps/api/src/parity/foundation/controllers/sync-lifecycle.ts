import { and, asc, eq, gt, inArray } from "drizzle-orm";
import db from "../../../database";
import {
  activityTable,
  columnTable,
  taskTable,
} from "../../../database/schema";
import { columnExtTable, taskExtTable } from "../../../database/schema-parity";
import { defaultCategory } from "../categories";
import {
  emptyLifecycle,
  replayLifecycle,
  transitionLifecycle,
} from "../lifecycle";

export async function syncLifecycle(taskId: string, backfill = false) {
  await db.transaction(async (tx) => {
    const [task] = await tx
      .select()
      .from(taskTable)
      .where(eq(taskTable.id, taskId))
      .for("update");
    if (!task) return;
    const columns = await tx
      .select({
        id: columnTable.id,
        slug: columnTable.slug,
        isFinal: columnTable.isFinal,
        category: columnExtTable.category,
      })
      .from(columnTable)
      .leftJoin(columnExtTable, eq(columnExtTable.columnId, columnTable.id))
      .where(eq(columnTable.projectId, task.projectId));
    const categoryOf = (slug: string) => {
      const column = columns.find((row) => row.slug === slug);
      return column?.category ?? defaultCategory(slug, column?.isFinal);
    };
    const column = columns.find((row) => row.id === task.columnId);
    const current = column?.category ?? categoryOf(task.status);
    const [previous] = await tx
      .select()
      .from(taskExtTable)
      .where(eq(taskExtTable.taskId, taskId));
    let lifecycle;
    if (backfill) {
      const activities = await tx
        .select()
        .from(activityTable)
        .where(
          and(
            eq(activityTable.taskId, taskId),
            inArray(activityTable.type, ["status_changed", "moved"]),
          ),
        )
        .orderBy(asc(activityTable.createdAt), asc(activityTable.id));
      const events = activities.flatMap((activity) => {
        const data = activity.eventData as { newStatus?: unknown } | null;
        return typeof data?.newStatus === "string"
          ? [{ category: categoryOf(data.newStatus), at: activity.createdAt }]
          : [];
      });
      lifecycle = replayLifecycle(events, current);
      // Existing live observations survive an incomplete or older activity history.
      lifecycle.startedAt = previous?.startedAt ?? lifecycle.startedAt;
      if (current === "completed")
        lifecycle.completedAt = previous?.completedAt ?? lifecycle.completedAt;
      if (current === "canceled")
        lifecycle.canceledAt = previous?.canceledAt ?? lifecycle.canceledAt;
    } else {
      lifecycle = transitionLifecycle(
        previous ?? emptyLifecycle(),
        current,
        task.updatedAt,
      );
    }
    await tx
      .insert(taskExtTable)
      .values({ taskId, ...lifecycle })
      .onConflictDoUpdate({ target: taskExtTable.taskId, set: lifecycle });
  });
}

export async function backfillLifecycle(projectId?: string) {
  let after: string | undefined;
  let count = 0;
  while (true) {
    const tasks = await db
      .select({ id: taskTable.id })
      .from(taskTable)
      .where(
        and(
          after ? gt(taskTable.id, after) : undefined,
          projectId ? eq(taskTable.projectId, projectId) : undefined,
        ),
      )
      .orderBy(asc(taskTable.id))
      .limit(250);
    if (!tasks.length) return count;
    for (const task of tasks) await syncLifecycle(task.id, true);
    count += tasks.length;
    after = tasks.at(-1)?.id;
  }
}

import { and, asc, eq, gt, inArray } from "drizzle-orm";
import db from "../../../database";
import {
  activityTable,
  columnTable,
  taskTable,
} from "../../../database/schema";
import { columnExtTable, taskExtTable } from "../../../database/schema-parity";
import { defaultCategory } from "../categories";
import { emptyLifecycle, replayLifecycle } from "../lifecycle";

export type LifecycleTransition = {
  projectId?: string;
  status: string;
  at: Date;
};

export async function syncLifecycle(
  taskId: string,
  transition?: LifecycleTransition,
) {
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
        projectId: columnTable.projectId,
        slug: columnTable.slug,
        isFinal: columnTable.isFinal,
        category: columnExtTable.category,
      })
      .from(columnTable)
      .leftJoin(columnExtTable, eq(columnExtTable.columnId, columnTable.id))
      .where(
        inArray(columnTable.projectId, [
          task.projectId,
          transition?.projectId ?? task.projectId,
        ]),
      );
    const categoryOf = (slug: string, projectId = task.projectId) => {
      const column = columns.find(
        (row) => row.slug === slug && row.projectId === projectId,
      );
      return column?.category ?? defaultCategory(slug, column?.isFinal);
    };
    const column = columns.find((row) => row.id === task.columnId);
    const current = column?.category ?? categoryOf(task.status);
    const [previous] = await tx
      .select()
      .from(taskExtTable)
      .where(eq(taskExtTable.taskId, taskId));
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
    // Activity subscribers run asynchronously too. Include the triggering
    // transition even before its activity insert commits.
    if (transition) {
      events.push({
        category: categoryOf(transition.status, transition.projectId),
        at: transition.at,
      });
    }
    events.sort((a, b) => a.at.getTime() - b.at.getTime());
    const lifecycle = replayLifecycle(
      events,
      current,
      previous ?? emptyLifecycle(),
    );
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
    for (const task of tasks) await syncLifecycle(task.id);
    count += tasks.length;
    after = tasks.at(-1)?.id;
  }
}

import { and, asc, eq, gt, inArray } from "drizzle-orm";
import db from "../../../database";
import { publishEvent } from "../../../events";
import {
  activityTable,
  columnTable,
  taskTable,
} from "../../../database/schema";
import { columnExtTable, taskExtTable } from "../../../database/schema-parity";
import { defaultCategory } from "../categories";
import { emptyLifecycle, replayLifecycle } from "../lifecycle";
import {
  lifecycleHistory,
  type LifecycleTransition,
} from "../lifecycle-history";

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
    const activities = await tx
      .select({
        type: activityTable.type,
        createdAt: activityTable.createdAt,
        eventData: activityTable.eventData,
      })
      .from(activityTable)
      .where(
        and(
          eq(activityTable.taskId, taskId),
          inArray(activityTable.type, ["status_changed", "moved"]),
        ),
      )
      .orderBy(asc(activityTable.createdAt), asc(activityTable.id));
    // Include the triggering transition before its asynchronous activity insert
    // commits, with the source status needed to identify terminal-state entry.
    const history = lifecycleHistory(activities, task.projectId, transition);
    const projectIds = new Set([task.projectId]);
    for (const event of history) {
      projectIds.add(event.projectId);
      projectIds.add(event.previousProjectId);
    }
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
      .where(inArray(columnTable.projectId, [...projectIds]));
    const categoryOf = (slug: string, projectId = task.projectId) => {
      const column = columns.find(
        (row) => row.slug === slug && row.projectId === projectId,
      );
      return column?.category ?? defaultCategory(slug, column?.isFinal);
    };
    const column = columns.find((row) => row.id === task.columnId);
    const [previous] = await tx
      .select()
      .from(taskExtTable)
      .where(eq(taskExtTable.taskId, taskId));
    // Archival removes the board column, but does not reopen completed work.
    const latestStatus = history.at(-1);
    const current =
      task.status === "archived"
        ? latestStatus
          ? categoryOf(latestStatus.status, latestStatus.projectId)
          : previous?.completedAt
            ? "completed"
            : previous?.canceledAt
              ? "canceled"
              : previous?.startedAt
                ? "started"
                : "unstarted"
        : (column?.category ?? categoryOf(task.status));
    const events = history.map((event) => ({
      category: categoryOf(event.status, event.projectId),
      fromCategory:
        event.previousStatus === undefined
          ? undefined
          : categoryOf(event.previousStatus, event.previousProjectId),
      at: event.at,
    }));
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
  await publishEvent(
    "parity.lifecycle_updated",
    { taskId },
    { waitForHandlers: true },
  );
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

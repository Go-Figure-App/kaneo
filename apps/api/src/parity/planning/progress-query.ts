import { and, eq, inArray, isNull, or, sql } from "drizzle-orm";
import db from "../../database";
import { columnTable, taskTable } from "../../database/schema";
import {
  columnExtTable,
  projectMilestoneTable,
  taskExtTable,
  workspaceExtTable,
} from "../../database/schema-parity";
import { acceptedTaskCondition } from "../triage/visibility";
import type { Category } from "../foundation/categories";
import { addCounts, emptyCounts, type ProgressCounts } from "./progress";

export const taskCategory = sql<Category>`coalesce(${columnExtTable.category}, CASE
  WHEN ${taskTable.status} = 'archived' AND ${taskExtTable.completedAt} IS NOT NULL THEN 'completed'
  WHEN ${taskTable.status} = 'archived' AND ${taskExtTable.canceledAt} IS NOT NULL THEN 'canceled'
  WHEN ${taskTable.status} = 'archived' AND ${taskExtTable.startedAt} IS NOT NULL THEN 'started'
  WHEN coalesce(${columnTable.slug}, ${taskTable.status}) IN ('canceled', 'cancelled', 'declined', 'duplicate') THEN 'canceled'
  WHEN ${columnTable.isFinal} THEN 'completed'
  WHEN coalesce(${columnTable.slug}, ${taskTable.status}) IN ('backlog', 'triage') THEN 'backlog'
  WHEN coalesce(${columnTable.slug}, ${taskTable.status}) IN ('in-progress', 'in-review', 'started', 'doing') THEN 'started'
  ELSE 'unstarted' END)`;

// Callers supply only projects already authorized in the current workspace.
export async function progressCounts(projectIds: string[]) {
  const projects = new Map<string, ProgressCounts>();
  const milestones = new Map<string, ProgressCounts>();
  if (!projectIds.length) return { projects, milestones };
  const rows = await db
    .select({
      projectId: taskTable.projectId,
      milestoneId: projectMilestoneTable.id,
      total: sql<number>`count(*)::int`,
      completed: sql<number>`count(*) FILTER (WHERE ${taskCategory} = 'completed')::int`,
      totalPoints: sql<number>`coalesce(sum(coalesce(${taskExtTable.estimate}, 1)), 0)::float8`,
      completedPoints: sql<number>`coalesce(sum(coalesce(${taskExtTable.estimate}, 1)) FILTER (WHERE ${taskCategory} = 'completed'), 0)::float8`,
    })
    .from(taskTable)
    .leftJoin(taskExtTable, eq(taskExtTable.taskId, taskTable.id))
    .leftJoin(
      columnTable,
      and(
        or(
          eq(columnTable.id, taskTable.columnId),
          and(
            isNull(taskTable.columnId),
            eq(columnTable.slug, taskTable.status),
          ),
        ),
        eq(columnTable.projectId, taskTable.projectId),
      ),
    )
    .leftJoin(columnExtTable, eq(columnExtTable.columnId, columnTable.id))
    .leftJoin(
      projectMilestoneTable,
      and(
        eq(projectMilestoneTable.id, taskExtTable.milestoneId),
        eq(projectMilestoneTable.projectId, taskTable.projectId),
      ),
    )
    .where(
      and(
        inArray(taskTable.projectId, projectIds),
        acceptedTaskCondition(taskTable.id),
        sql`${taskCategory} <> 'canceled'`,
      ),
    )
    .groupBy(taskTable.projectId, projectMilestoneTable.id);
  for (const row of rows) {
    projects.set(
      row.projectId,
      addCounts([projects.get(row.projectId) ?? emptyCounts(), row]),
    );
    if (row.milestoneId) milestones.set(row.milestoneId, row);
  }
  return { projects, milestones };
}

export async function estimatesEnabled(workspaceId: string) {
  const [settings] = await db
    .select({ scale: workspaceExtTable.estimateScale })
    .from(workspaceExtTable)
    .where(eq(workspaceExtTable.workspaceId, workspaceId));
  return settings !== undefined && settings.scale !== "none";
}

import { and, eq, inArray, isNull, or, sql } from "drizzle-orm";
import { columnTable, projectTable, taskTable } from "../../database/schema";
import {
  columnExtTable,
  cycleTable,
  taskExtTable,
} from "../../database/schema-parity";
import { readableProjects, type Actor } from "../planning/access";
import { taskCategory } from "../planning/progress-query";
import type { InsightsQuery } from "./schema";
import type { ReportScope } from "./scope";

export function taskSource(
  who: Actor,
  query: InsightsQuery,
  scope: ReportScope,
) {
  const condition = and(
    readableProjects(who),
    scope.projectIds.length
      ? inArray(projectTable.id, scope.projectIds)
      : sql`false`,
    query.cycleId ? eq(cycleTable.id, query.cycleId) : undefined,
    query.assigneeId === "unassigned"
      ? isNull(taskTable.userId)
      : query.assigneeId
        ? eq(taskTable.userId, query.assigneeId)
        : undefined,
  );
  // Upstream timestamps are UTC without a timezone; parity timestamps carry one.
  return sql`select ${taskTable.id} as id, ${taskTable.projectId} as project_id,
    ${projectTable.name} as project_name, ${taskTable.userId} as assignee_id,
    ${taskTable.priority} as priority, ${taskTable.status} as status,
    ${taskTable.columnId} as column_id, ${taskCategory} as category,
    ${taskTable.createdAt} at time zone 'UTC' as created_at,
    ${taskExtTable.startedAt} as started_at, ${taskExtTable.completedAt} as completed_at,
    ${taskExtTable.triagedAt} as triaged_at, ${taskExtTable.triageState} as triage_state,
    ${cycleTable.id} as cycle_id, coalesce(${cycleTable.name}, ${cycleTable.number}::text) as cycle_name,
    ${scope.settings.estimateScale !== "none" ? sql`coalesce(${taskExtTable.estimate}, 1)` : sql`1`}::float8 as points
    from ${taskTable}
    inner join ${projectTable} on ${projectTable.id} = ${taskTable.projectId}
    left join ${taskExtTable} on ${taskExtTable.taskId} = ${taskTable.id}
    left join ${cycleTable} on ${cycleTable.id} = ${taskExtTable.cycleId} and ${cycleTable.workspaceId} = ${projectTable.workspaceId}
    left join ${columnTable} on ${and(
      eq(columnTable.projectId, taskTable.projectId),
      or(
        eq(columnTable.id, taskTable.columnId),
        and(isNull(taskTable.columnId), eq(columnTable.slug, taskTable.status)),
      ),
    )}
    left join ${columnExtTable} on ${columnExtTable.columnId} = ${columnTable.id}
    where ${condition}`;
}

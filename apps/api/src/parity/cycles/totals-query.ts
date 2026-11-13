import { and, eq, inArray, isNull, or, sql, type SQL } from "drizzle-orm";
import db from "../../database";
import { columnTable, projectTable, taskTable } from "../../database/schema";
import {
  columnExtTable,
  cycleTable,
  taskExtTable,
} from "../../database/schema-parity";
import type { DbOrTx } from "../../project-access/db-or-tx";
import { taskCategory } from "../planning/progress-query";
import { acceptedTaskCondition } from "../triage/visibility";
import type { CycleTotals } from "./totals";

// One grouped query supports both visible live totals and internal snapshots.
// The caller supplies the access condition for every user-facing aggregate.
export async function cycleTotalsByProject(
  cycleIds: string[],
  workspaceId: string,
  estimates: boolean,
  access?: SQL,
  database: DbOrTx = db,
) {
  if (!cycleIds.length) return [];
  const points = estimates
    ? sql`coalesce(${taskExtTable.estimate}, 1)`
    : sql`1`;
  return database
    .select({
      cycleId: cycleTable.id,
      projectId: projectTable.id,
      scopeCount: sql<number>`count(*)::int`,
      scopePoints: sql<number>`coalesce(sum(${points}), 0)::float8`,
      startedCount: sql<number>`count(*) FILTER (WHERE ${taskCategory} = 'started')::int`,
      startedPoints: sql<number>`coalesce(sum(${points}) FILTER (WHERE ${taskCategory} = 'started'), 0)::float8`,
      completedCount: sql<number>`count(*) FILTER (WHERE ${taskCategory} = 'completed')::int`,
      completedPoints: sql<number>`coalesce(sum(${points}) FILTER (WHERE ${taskCategory} = 'completed'), 0)::float8`,
    })
    .from(taskTable)
    .innerJoin(projectTable, eq(projectTable.id, taskTable.projectId))
    .innerJoin(taskExtTable, eq(taskExtTable.taskId, taskTable.id))
    .innerJoin(
      cycleTable,
      and(
        eq(cycleTable.id, taskExtTable.cycleId),
        eq(cycleTable.workspaceId, projectTable.workspaceId),
      ),
    )
    .leftJoin(
      columnTable,
      and(
        eq(columnTable.projectId, taskTable.projectId),
        or(
          eq(columnTable.id, taskTable.columnId),
          and(
            isNull(taskTable.columnId),
            eq(columnTable.slug, taskTable.status),
          ),
        ),
      ),
    )
    .leftJoin(columnExtTable, eq(columnExtTable.columnId, columnTable.id))
    .where(
      and(
        inArray(cycleTable.id, cycleIds),
        eq(projectTable.workspaceId, workspaceId),
        isNull(projectTable.archivedAt),
        acceptedTaskCondition(taskTable.id),
        sql`${taskCategory} <> 'canceled'`,
        access,
      ),
    )
    .groupBy(cycleTable.id, projectTable.id);
}

export function groupCycleTotals(rows: (CycleTotals & { cycleId: string })[]) {
  const grouped = new Map<string, CycleTotals[]>();
  for (const row of rows) {
    const group = grouped.get(row.cycleId) ?? [];
    group.push(row);
    grouped.set(row.cycleId, group);
  }
  return grouped;
}

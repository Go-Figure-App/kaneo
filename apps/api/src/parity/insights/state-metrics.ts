import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import db from "../../database";
import { activityTable, columnTable } from "../../database/schema";
import { columnExtTable } from "../../database/schema-parity";
import type { Category } from "../foundation/categories";
import type { Actor } from "../planning/access";
import type { ReportRange } from "./range";
import type { InsightRow, InsightsQuery } from "./schema";
import type { ReportScope } from "./scope";
import { stateDurations } from "./state-history";
import { taskSource } from "./task-source";

export async function stateMetrics(
  who: Actor,
  query: InsightsQuery,
  scope: ReportScope,
  range: ReportRange,
  now: Date,
) {
  const columns = scope.projectIds.length
    ? await db
        .select({
          projectId: columnTable.projectId,
          slug: columnTable.slug,
          isFinal: columnTable.isFinal,
          category: columnExtTable.category,
        })
        .from(columnTable)
        .leftJoin(columnExtTable, eq(columnExtTable.columnId, columnTable.id))
        .where(inArray(columnTable.projectId, scope.projectIds))
    : [];
  const values = new Map<Category, { total: number; count: number }>();
  const readable = new Set(scope.projectIds);
  let after = "";
  let partialHistory = false;
  // Bound memory and load each page's activities together, never per task.
  for (;;) {
    const tasks = await db.execute<{
      id: string;
      projectId: string;
      status: string;
      createdAt: number;
    }>(sql`
      with report_tasks as (${taskSource(who, query, scope)})
      select id, project_id as "projectId", status, extract(epoch from created_at)::float8 * 1000 as "createdAt" from report_tasks
      where id > ${after} and created_at < ${range.endsAt.toISOString()}::timestamptz
        and coalesce(triage_state, 'accepted') = 'accepted'
      order by id limit 250`);
    if (!tasks.rows.length) break;
    const activities = await db
      .select({
        taskId: activityTable.taskId,
        type: activityTable.type,
        createdAt: activityTable.createdAt,
        eventData: activityTable.eventData,
      })
      .from(activityTable)
      .where(
        and(
          inArray(
            activityTable.taskId,
            tasks.rows.map((task) => task.id),
          ),
          inArray(activityTable.type, ["status_changed", "moved"]),
        ),
      )
      .orderBy(asc(activityTable.createdAt), asc(activityTable.id))
      .limit(100_001);
    if (activities.length > 100_000)
      throw new HTTPException(400, {
        message: "Narrow the history report to a project or assignee",
      });
    const byTask = new Map<string, typeof activities>();
    for (const event of activities) {
      const list = byTask.get(event.taskId) ?? [];
      list.push(event);
      byTask.set(event.taskId, list);
    }
    for (const task of tasks.rows) {
      const result = stateDurations(
        { ...task, createdAt: new Date(task.createdAt) },
        byTask.get(task.id) ?? [],
        columns,
        readable,
        range.startsAt,
        range.endsAt,
        now,
      );
      partialHistory ||= result.missing;
      for (const [category, duration] of result.totals) {
        const value = values.get(category) ?? { total: 0, count: 0 };
        value.total += duration;
        value.count++;
        values.set(category, value);
      }
    }
    after = tasks.rows.at(-1)!.id;
  }
  const rows: InsightRow[] = [...values]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => ({
      key,
      label: null,
      series: "total",
      value: value.total / value.count,
      points: null,
      samples: value.count,
    }));
  return { rows, historyAvailable: rows.length > 0, partialHistory };
}

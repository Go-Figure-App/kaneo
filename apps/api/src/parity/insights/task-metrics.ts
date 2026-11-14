import { sql, type SQL } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import db from "../../database";
import { labelTable, userTable } from "../../database/schema";
import type { Actor } from "../planning/access";
import type { ReportRange } from "./range";
import type { InsightRow, InsightsQuery, Slice } from "./schema";
import type { ReportScope } from "./scope";
import { taskSource } from "./task-source";

function grouping(
  slice: Slice,
  at: SQL,
  timeZone: string,
  workspaceId: string,
) {
  if (slice === "week")
    return {
      key: sql`to_char(date_trunc('week', ${at} at time zone ${timeZone}), 'YYYY-MM-DD')`,
      label: sql`null::text`,
      joins: sql``,
    };
  if (slice === "project")
    return { key: sql`t.project_id`, label: sql`t.project_name`, joins: sql`` };
  if (slice === "cycle")
    return {
      key: sql`coalesce(t.cycle_id, 'none')`,
      label: sql`t.cycle_name`,
      joins: sql``,
    };
  if (slice === "priority")
    return { key: sql`t.priority`, label: sql`null::text`, joins: sql`` };
  if (slice === "assignee")
    return {
      key: sql`coalesce(t.assignee_id, 'unassigned')`,
      label: sql`${userTable.name}`,
      joins: sql`left join ${userTable} on ${userTable.id} = t.assignee_id`,
    };
  return {
    key: sql`coalesce('label:' || ${labelTable.name}, 'none')`,
    label: sql`${labelTable.name}`,
    joins: sql`left join ${labelTable} on ${labelTable.taskId} = t.id
      and ${labelTable.workspaceId} = ${workspaceId} and ${labelTable.deletionStartedAt} is null`,
  };
}

export async function taskMetrics(
  who: Actor,
  query: InsightsQuery,
  scope: ReportScope,
  range: ReportRange,
  slice: Slice,
) {
  const { measure } = query;
  const duration = ["lead-time", "cycle-time", "time-to-triage"].includes(
    measure,
  );
  const start =
    measure === "cycle-time" ? sql`t.started_at` : sql`t.created_at`;
  const end =
    measure === "time-to-triage" ? sql`t.triaged_at` : sql`t.completed_at`;
  const delivery = sql`coalesce(t.triage_state, 'accepted') = 'accepted' and t.category <> 'canceled'`;
  const complete = sql`${delivery} and t.category = 'completed'`;
  const within = (at: SQL) =>
    sql`${at} >= ${range.startsAt.toISOString()}::timestamptz and ${at} < ${range.endsAt.toISOString()}::timestamptz`;
  const at = measure === "workload" ? sql`t.created_at` : end;
  const group = grouping(
    slice,
    sql`sample.at`,
    scope.settings.timeZone,
    who.workspaceId,
  );
  const samples =
    measure === "created-completed"
      ? sql`cross join lateral (
        select t.created_at as at, 'created'::text as series where ${delivery} and ${within(sql`t.created_at`)}
        union all select t.completed_at, 'completed' where ${complete} and ${within(sql`t.completed_at`)}
      ) sample`
      : sql`cross join lateral (select ${at} as at, 'total'::text as series) sample`;
  const selection =
    measure === "created-completed"
      ? sql`true`
      : measure === "workload"
        ? sql`${delivery} and t.category <> 'completed' and t.status <> 'archived'
        ${query.from ? sql`and t.created_at >= ${range.startsAt.toISOString()}::timestamptz` : sql``}
        ${query.to ? sql`and t.created_at < ${range.endsAt.toISOString()}::timestamptz` : sql``}`
        : measure === "time-to-triage"
          ? sql`t.triage_state in ('accepted', 'declined', 'duplicate') and ${within(end)}`
          : sql`${complete} and ${within(end)}`;
  const result = await db.execute<{
    key: string;
    label: string | null;
    series: "total" | "created" | "completed";
    value: number | null;
    p75: number | null;
    points: number;
    samples: number;
    missing: number;
  }>(sql`with report_tasks as (${taskSource(who, query, scope)})
    select ${group.key} as key, ${group.label} as label, sample.series,
      ${
        duration
          ? sql`percentile_cont(0.5) within group (order by extract(epoch from (${end} - ${start})) / 86400)
          filter (where ${start} is not null and ${end} >= ${start})`
          : sql`count(*)::float8`
      } as value,
      ${
        duration
          ? sql`percentile_cont(0.75) within group (order by extract(epoch from (${end} - ${start})) / 86400)
          filter (where ${start} is not null and ${end} >= ${start})`
          : sql`null::float8`
      } as p75,
      coalesce(sum(t.points), 0)::float8 as points,
      count(*) ${duration ? sql`filter (where ${start} is not null and ${end} >= ${start})` : sql``}::int as samples,
      ${duration ? sql`count(*) filter (where ${start} is null or ${end} < ${start})::int` : sql`0`} as missing
    from report_tasks t ${samples} ${group.joins}
    where ${selection}
    group by 1, 2, 3 order by 1, 3 limit 2001`);
  if (result.rows.length > 2000)
    throw new HTTPException(400, {
      message: "Narrow the report filters to fewer groups",
    });
  const rows = result.rows.flatMap<InsightRow>((row) => {
    if (row.value === null) return [];
    const common = { key: row.key, label: row.label, samples: row.samples };
    return duration
      ? [
          {
            ...common,
            series: "median" as const,
            value: row.value,
            points: null,
          },
          { ...common, series: "p75" as const, value: row.p75!, points: null },
        ]
      : [
          {
            ...common,
            series: row.series,
            value: row.value,
            points: scope.settings.estimateScale !== "none" ? row.points : null,
          },
        ];
  });
  return {
    rows,
    historyAvailable: !duration || rows.length > 0,
    partialHistory: result.rows.some((row) => row.missing > 0),
  };
}

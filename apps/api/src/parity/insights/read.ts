import type { Actor } from "../planning/access";
import { localDay } from "../cycles/calendar";
import { cacheInsights, cachedInsights, insightsRevision } from "./cache";
import { cycleMetrics } from "./cycle-metrics";
import { reportRange, reportSlice, shiftDay } from "./range";
import { reportScope } from "./scope";
import { stateMetrics } from "./state-metrics";
import { taskMetrics } from "./task-metrics";
import type { Insights, InsightsQuery, Slice } from "./schema";

export async function getInsights(
  who: Actor,
  query: InsightsQuery,
  now = new Date(),
): Promise<Insights> {
  const slice = reportSlice(query);
  // Re-authorize the project scope before every cache lookup, including hits.
  const scope = await reportScope(who, query);
  const { timeZone, estimateScale } = scope.settings;
  const range = reportRange(
    {
      ...query,
      from:
        query.from ??
        (scope.cycle ? localDay(scope.cycle.startsAt, timeZone) : undefined),
      to:
        query.to ??
        (scope.cycle
          ? localDay(
              query.measure === "burndown"
                ? scope.cycle.endsAt
                : new Date(+scope.cycle.endsAt - 1),
              timeZone,
            )
          : undefined),
    },
    timeZone,
    now,
  );
  const key = JSON.stringify([
    who,
    query,
    slice,
    range.from,
    range.to,
    scope.projectIds,
    timeZone,
    estimateScale,
  ]);
  const cached = cachedInsights(key, +now);
  if (cached) return cached;
  const revision = insightsRevision();
  const data = ["velocity", "burndown", "scope-change"].includes(query.measure)
    ? await cycleMetrics(who, query, scope, range, now)
    : query.measure === "time-in-state"
      ? await stateMetrics(who, query, scope, range, now)
      : await taskMetrics(who, query, scope, range, slice as Slice);
  // Weekly count reports include measured zero weeks, unlike duration reports
  // where absence of evidence must remain an empty sample.
  if (
    slice === "week" &&
    ["throughput", "created-completed"].includes(query.measure)
  ) {
    const first = new Date(`${range.from}T00:00:00Z`);
    const weekday = (first.getUTCDay() + 6) % 7;
    const series =
      query.measure === "created-completed"
        ? (["created", "completed"] as const)
        : (["total"] as const);
    for (
      let day = shiftDay(range.from, -weekday);
      day <= range.to;
      day = shiftDay(day, 7)
    ) {
      for (const name of series)
        if (!data.rows.some((row) => row.key === day && row.series === name))
          data.rows.push({
            key: day,
            label: null,
            series: name,
            value: 0,
            points: estimateScale === "none" ? null : 0,
            samples: 0,
          });
    }
    data.rows.sort(
      (a, b) => a.key.localeCompare(b.key) || a.series.localeCompare(b.series),
    );
  }
  const result = {
    measure: query.measure,
    slice,
    from: range.from,
    to: range.to,
    timeZone,
    estimates: estimateScale !== "none",
    ...data,
  };
  // An update during a report calculation must not repopulate an invalidated cache.
  if (revision === insightsRevision())
    cacheInsights(key, who.workspaceId, result, +now);
  return result;
}

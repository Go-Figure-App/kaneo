import {
  and,
  asc,
  desc,
  eq,
  gte,
  inArray,
  isNotNull,
  lt,
  lte,
} from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import db from "../../database";
import { cycleDayTable, cycleTable } from "../../database/schema-parity";
import { localDay } from "../cycles/calendar";
import { visibleHistory, visibleSummary } from "../cycles/history";
import { sumTotals } from "../cycles/totals";
import { cycleTotalsByProject, groupCycleTotals } from "../cycles/totals-query";
import { readableProjects, type Actor } from "../planning/access";
import type { ReportRange } from "./range";
import type { InsightRow, InsightsQuery } from "./schema";
import type { ReportScope } from "./scope";

export async function cycleMetrics(
  who: Actor,
  query: InsightsQuery,
  scope: ReportScope,
  range: ReportRange,
  now: Date,
) {
  const selected = await db
    .select()
    .from(cycleTable)
    .where(
      and(
        eq(cycleTable.workspaceId, who.workspaceId),
        query.cycleId ? eq(cycleTable.id, query.cycleId) : undefined,
        lt(cycleTable.startsAt, range.endsAt),
        gte(cycleTable.endsAt, range.startsAt),
        lte(cycleTable.startsAt, now),
      ),
    )
    .orderBy(asc(cycleTable.startsAt), asc(cycleTable.number))
    .limit(2001);
  if (selected.length > 2000)
    throw new HTTPException(400, {
      message: "Narrow the cycle report date range",
    });
  if (!selected.length)
    return { rows: [], historyAvailable: false, partialHistory: false };
  const previous =
    query.measure === "velocity"
      ? await db
          .select()
          .from(cycleTable)
          .where(
            and(
              eq(cycleTable.workspaceId, who.workspaceId),
              isNotNull(cycleTable.completedAt),
              lte(cycleTable.endsAt, selected[0]!.startsAt),
            ),
          )
          .orderBy(desc(cycleTable.startsAt), desc(cycleTable.number))
          .limit(3)
      : [];
  const cycles = [...previous.reverse(), ...selected];
  const ids = new Set(scope.projectIds);
  const snapshots =
    query.measure === "velocity"
      ? []
      : await db
          .select()
          .from(cycleDayTable)
          .where(
            inArray(
              cycleDayTable.cycleId,
              selected.map((cycle) => cycle.id),
            ),
          )
          .orderBy(cycleDayTable.day);
  const live = groupCycleTotals(
    (
      await cycleTotalsByProject(
        selected
          .filter((cycle) => !cycle.completedAt && cycle.endsAt > now)
          .map((cycle) => cycle.id),
        who.workspaceId,
        scope.settings.estimateScale !== "none",
        readableProjects(who),
      )
    ).filter((row) => ids.has(row.projectId)),
  );
  const rows: InsightRow[] = [];
  let partialHistory = false;
  const finished: ({ count: number; points: number } | null)[] = [];
  const points = (value: number) =>
    scope.settings.estimateScale === "none" ? null : value;
  for (const cycle of cycles) {
    const closed = visibleSummary(cycle.summary, ids);
    const current =
      !cycle.completedAt && cycle.startsAt <= now && now < cycle.endsAt;
    const totals = cycle.completedAt
      ? closed
      : current
        ? sumTotals(live.get(cycle.id) ?? [])
        : null;
    if (cycle.completedAt)
      finished.push(
        closed
          ? { count: closed.completedCount, points: closed.completedPoints }
          : null,
      );
    if (!selected.some((item) => item.id === cycle.id)) continue;
    const common = { key: cycle.id, label: cycle.name ?? String(cycle.number) };
    if (!totals) {
      partialHistory = true;
      continue;
    }
    if (query.measure === "velocity") {
      rows.push({
        ...common,
        series: "completed",
        value: totals.completedCount,
        points: points(totals.completedPoints),
        samples: 1,
      });
      const recent = finished.slice(-3);
      if (recent.length && recent.every((item) => item !== null))
        rows.push({
          ...common,
          series: "average",
          samples: recent.length,
          value:
            recent.reduce((sum, item) => sum + item.count, 0) / recent.length,
          points: points(
            recent.reduce((sum, item) => sum + item.points, 0) / recent.length,
          ),
        });
      else if (recent.some((item) => item === null)) partialHistory = true;
      continue;
    }
    const history = snapshots.filter((day) => day.cycleId === cycle.id);
    const available = history.filter(
      (day) =>
        Object.keys(day.projectTotals).length > 0 ||
        (day.scopeCount === 0 && day.scopePoints === 0),
    );
    if (available.length !== history.length) partialHistory = true;
    const first = available[0];
    const startDay = localDay(cycle.startsAt, scope.settings.timeZone);
    if (!first || first.day !== startDay) partialHistory = true;
    if (query.measure === "scope-change") {
      // A later sample is not evidence of the original scope.
      if (!first || first.day !== startDay || !cycle.completedAt) continue;
      const start = visibleHistory(first.projectTotals, ids);
      rows.push(
        {
          ...common,
          series: "start",
          value: start.scopeCount,
          points: points(start.scopePoints),
          samples: 1,
        },
        {
          ...common,
          series: "end",
          value: totals.scopeCount,
          points: points(totals.scopePoints),
          samples: 1,
        },
      );
      continue;
    }
    const days = new Map(
      available.map((day) => [day.day, visibleHistory(day.projectTotals, ids)]),
    );
    const finalDay = localDay(
      cycle.completedAt ?? now,
      scope.settings.timeZone,
    );
    days.set(finalDay, totals);
    const start =
      first?.day === startDay ? visibleHistory(first.projectTotals, ids) : null;
    const endDay = localDay(cycle.endsAt, scope.settings.timeZone);
    const duration = Math.max(1, Date.parse(endDay) - Date.parse(startDay));
    for (const [day, value] of [...days].sort(([a], [b]) =>
      a.localeCompare(b),
    )) {
      if (day < range.from || day > range.to) continue;
      rows.push({
        key: day,
        label: null,
        series: "remaining",
        value: Math.max(0, value.scopeCount - value.completedCount),
        points: points(Math.max(0, value.scopePoints - value.completedPoints)),
        samples: 1,
      });
    }
    if (start)
      for (const day of [startDay, endDay]) {
        if (day < range.from || day > range.to) continue;
        const fraction = Math.max(
          0,
          1 - (Date.parse(day) - Date.parse(startDay)) / duration,
        );
        rows.push({
          key: day,
          label: null,
          series: "ideal",
          value: start.scopeCount * fraction,
          points: points(start.scopePoints * fraction),
          samples: 1,
        });
      }
  }
  return { rows, historyAvailable: rows.length > 0, partialHistory };
}

import {
  and,
  asc,
  desc,
  eq,
  gt,
  isNotNull,
  isNull,
  lte,
  or,
} from "drizzle-orm";
import db from "../../database";
import { projectTable } from "../../database/schema";
import { cycleDayTable, cycleTable } from "../../database/schema-parity";
import { readableProjects, type Actor } from "../planning/access";
import { findCycle } from "./access";
import { cyclePhase } from "./calendar";
import { visibleHistory, visibleSummary } from "./history";
import type { CycleQuery } from "./schema";
import { cycleSettings } from "./settings-read";
import { sumTotals } from "./totals";
import { cycleTotalsByProject, groupCycleTotals } from "./totals-query";

type Cycle = typeof cycleTable.$inferSelect;
async function cycleResponses(
  rows: Cycle[],
  who: Actor,
  estimates: boolean,
  now: Date,
) {
  const [projects, counts] = await Promise.all([
    db
      .select({ id: projectTable.id })
      .from(projectTable)
      .where(readableProjects(who)),
    cycleTotalsByProject(
      rows.map((row) => row.id),
      who.workspaceId,
      estimates,
      readableProjects(who),
    ),
  ]);
  const projectIds = new Set(projects.map((project) => project.id));
  const totals = groupCycleTotals(counts);
  return {
    projectIds,
    items: rows.map((cycle) => ({
      ...cycle,
      phase: cyclePhase(cycle, now),
      progress: sumTotals(totals.get(cycle.id) ?? []),
      // Never serialize the stored workspace aggregate or per-project map.
      summary: visibleSummary(cycle.summary, projectIds),
    })),
  };
}

export async function listCycles(
  who: Actor,
  query: CycleQuery,
  now = new Date(),
) {
  const settings = await cycleSettings(who.workspaceId);
  const { phase, page, pageSize } = query;
  const condition =
    phase === "current"
      ? and(
          isNull(cycleTable.completedAt),
          lte(cycleTable.startsAt, now),
          gt(cycleTable.endsAt, now),
        )
      : phase === "upcoming"
        ? and(isNull(cycleTable.completedAt), gt(cycleTable.startsAt, now))
        : phase === "past"
          ? or(isNotNull(cycleTable.completedAt), lte(cycleTable.endsAt, now))
          : undefined;
  const rows = await db
    .select()
    .from(cycleTable)
    .where(and(eq(cycleTable.workspaceId, who.workspaceId), condition))
    .orderBy(
      phase === "upcoming"
        ? asc(cycleTable.startsAt)
        : desc(cycleTable.startsAt),
      desc(cycleTable.number),
    )
    .limit(pageSize + 1)
    .offset((page - 1) * pageSize);
  const { items } = await cycleResponses(
    rows.slice(0, pageSize),
    who,
    settings.estimateScale !== "none",
    now,
  );
  return { items, settings, page, pageSize, hasMore: rows.length > pageSize };
}

export async function getCycle(id: string, who: Actor, now = new Date()) {
  const cycle = await findCycle(id, who);
  const settings = await cycleSettings(who.workspaceId);
  const [{ items, projectIds }, days] = await Promise.all([
    cycleResponses([cycle], who, settings.estimateScale !== "none", now),
    db
      .select()
      .from(cycleDayTable)
      .where(eq(cycleDayTable.cycleId, id))
      .orderBy(cycleDayTable.day),
  ]);
  const available = days.filter(
    (day) => Object.keys(day.projectTotals).length > 0 || day.scopeCount === 0,
  );
  return {
    ...items[0]!,
    settings,
    historyAvailable:
      (!cycle.completedAt || days.length > 0) &&
      available.length === days.length &&
      (!cycle.summary || Boolean(cycle.summary.projectTotals)),
    days: available.map((day) => ({
      day: day.day,
      ...visibleHistory(day.projectTotals, projectIds),
    })),
  };
}

import { sql } from "drizzle-orm";
import { cycleDayTable, type cycleTable } from "../../database/schema-parity";
import type { Transaction } from "../planning/access";
import { localDay } from "./calendar";
import { sumTotals } from "./totals";
import { cycleTotalsByProject } from "./totals-query";

export async function snapshotCycle(
  tx: Transaction,
  cycle: typeof cycleTable.$inferSelect,
  estimates: boolean,
  timeZone: string,
  now: Date,
) {
  const rows = await cycleTotalsByProject(
    [cycle.id],
    cycle.workspaceId,
    estimates,
    undefined,
    tx,
  );
  const totals = sumTotals(rows);
  const projectTotals = Object.fromEntries(
    rows.map((row) => [row.projectId, sumTotals([row])]),
  );
  const changed = await tx
    .insert(cycleDayTable)
    .values({
      cycleId: cycle.id,
      day: localDay(now, timeZone),
      ...totals,
      projectTotals,
    })
    .onConflictDoUpdate({
      target: [cycleDayTable.cycleId, cycleDayTable.day],
      set: { ...totals, projectTotals },
      setWhere: sql`(${cycleDayTable.scopeCount}, ${cycleDayTable.scopePoints}, ${cycleDayTable.startedCount}, ${cycleDayTable.startedPoints}, ${cycleDayTable.completedCount}, ${cycleDayTable.completedPoints}, ${cycleDayTable.projectTotals}) IS DISTINCT FROM (excluded.scope_count, excluded.scope_points, excluded.started_count, excluded.started_points, excluded.completed_count, excluded.completed_points, excluded.project_totals)`,
    })
    .returning({ cycleId: cycleDayTable.cycleId });
  return changed.length > 0;
}

import { sumTotals, type CycleSummary, type CycleTotals } from "./totals";

export function visibleHistory(
  totals: Record<string, CycleTotals>,
  projectIds: Set<string>,
) {
  return sumTotals(
    Object.entries(totals)
      .filter(([id]) => projectIds.has(id))
      .map(([, totals]) => totals),
  );
}
export function visibleSummary(
  summary: CycleSummary | null,
  projectIds: Set<string>,
) {
  // Imported aggregate-only history cannot be safely attributed to projects.
  if (!summary?.projectTotals) return null;
  const rows = Object.entries(summary.projectTotals)
    .filter(([id]) => projectIds.has(id))
    .map(([, totals]) => totals);
  return {
    ...sumTotals(rows),
    rolledOverCount: rows.reduce((sum, row) => sum + row.rolledOverCount, 0),
    rolledOverPoints: rows.reduce((sum, row) => sum + row.rolledOverPoints, 0),
  };
}

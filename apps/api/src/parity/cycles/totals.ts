export type CycleTotals = {
  scopeCount: number;
  scopePoints: number;
  startedCount: number;
  startedPoints: number;
  completedCount: number;
  completedPoints: number;
};
export type ProjectCycleSummary = CycleTotals & {
  rolledOverCount: number;
  rolledOverPoints: number;
};
export type CycleSummary = ProjectCycleSummary & {
  projectTotals?: Record<string, ProjectCycleSummary>;
};

export function emptyTotals(): CycleTotals {
  return {
    scopeCount: 0,
    scopePoints: 0,
    startedCount: 0,
    startedPoints: 0,
    completedCount: 0,
    completedPoints: 0,
  };
}

export function sumTotals(rows: Iterable<CycleTotals>): CycleTotals {
  const totals = emptyTotals();
  for (const row of rows) {
    totals.scopeCount += row.scopeCount;
    totals.scopePoints += row.scopePoints;
    totals.startedCount += row.startedCount;
    totals.startedPoints += row.startedPoints;
    totals.completedCount += row.completedCount;
    totals.completedPoints += row.completedPoints;
  }
  return totals;
}

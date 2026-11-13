import { estimatePoints, type EstimateScale } from "./estimates";

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

export function taskTotalsByProject(
  tasks: { projectId: string; category: string; estimate: number | null }[],
  scale: EstimateScale,
) {
  const projects = new Map<string, CycleTotals>();
  for (const task of tasks) {
    if (task.category === "canceled") continue;
    const totals = projects.get(task.projectId) ?? emptyTotals();
    const points = estimatePoints(task.estimate, scale);
    totals.scopeCount++;
    totals.scopePoints += points;
    if (task.category === "started") {
      totals.startedCount++;
      totals.startedPoints += points;
    }
    if (task.category === "completed") {
      totals.completedCount++;
      totals.completedPoints += points;
    }
    projects.set(task.projectId, totals);
  }
  return projects;
}

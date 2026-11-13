import { estimatePoints, type EstimateScale } from "./estimates";
import { emptyTotals, type CycleTotals } from "./totals";

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

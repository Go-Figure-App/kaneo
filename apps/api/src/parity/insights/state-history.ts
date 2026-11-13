import { lifecycleHistory } from "../foundation/lifecycle-history";
import { defaultCategory, type Category } from "../foundation/categories";

type Column = {
  projectId: string;
  slug: string;
  isFinal: boolean;
  category: Category | null;
};
type Activity = { type: string; createdAt: Date; eventData: unknown };
export function stateDurations(
  task: { projectId: string; createdAt: Date; status: string },
  activities: Activity[],
  columns: Column[],
  readable: Set<string>,
  from: Date,
  to: Date,
  now: Date,
) {
  const history = lifecycleHistory(activities, task.projectId).filter(
    (event) => event.at <= now,
  );
  const totals = new Map<Category, number>();
  const add = (projectId: string, status: string, start: Date, end: Date) => {
    if (!readable.has(projectId)) return;
    const duration =
      Math.min(+end, +to, +now) - Math.max(+start, +from, +task.createdAt);
    if (duration <= 0) return;
    const column = columns.find(
      (item) => item.projectId === projectId && item.slug === status,
    );
    const category =
      column?.category ?? defaultCategory(status, column?.isFinal);
    totals.set(category, (totals.get(category) ?? 0) + duration / 86_400_000);
  };
  const first = history[0];
  if (first?.previousStatus)
    add(
      first.previousProjectId,
      first.previousStatus,
      task.createdAt,
      first.at,
    );
  for (let index = 0; index < history.length; index++) {
    const event = history[index]!;
    add(event.projectId, event.status, event.at, history[index + 1]?.at ?? now);
  }
  // A current status alone cannot tell us how long a task has occupied it.
  return { totals, missing: history.length === 0 || !first?.previousStatus };
}

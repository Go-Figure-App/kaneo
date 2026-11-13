import type { Category } from "./categories";

export type Lifecycle = {
  startedAt: Date | null;
  completedAt: Date | null;
  canceledAt: Date | null;
};
export const emptyLifecycle = (): Lifecycle => ({
  startedAt: null,
  completedAt: null,
  canceledAt: null,
});

export function transitionLifecycle(
  previous: Lifecycle,
  category: Category,
  at: Date,
): Lifecycle {
  return {
    startedAt: previous.startedAt ?? (category === "started" ? at : null),
    completedAt: category === "completed" ? (previous.completedAt ?? at) : null,
    canceledAt: category === "canceled" ? (previous.canceledAt ?? at) : null,
  };
}

export function replayLifecycle(
  events: { category: Category; at: Date }[],
  current: Category,
): Lifecycle {
  const result = events.reduce(
    (state, event) => transitionLifecycle(state, event.category, event.at),
    emptyLifecycle(),
  );
  // Never invent terminal dates for tasks without a matching recorded transition.
  return {
    ...result,
    completedAt: current === "completed" ? result.completedAt : null,
    canceledAt: current === "canceled" ? result.canceledAt : null,
  };
}

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
  fromCategory?: Category,
): Lifecycle {
  const terminalAt = (terminal: Category, known: Date | null) => {
    if (category !== terminal) return null;
    if (fromCategory === terminal) return known;
    return fromCategory === undefined ? (known ?? at) : at;
  };
  return {
    startedAt: previous.startedAt ?? (category === "started" ? at : null),
    completedAt: terminalAt("completed", previous.completedAt),
    canceledAt: terminalAt("canceled", previous.canceledAt),
  };
}

export function replayLifecycle(
  events: { category: Category; fromCategory?: Category; at: Date }[],
  current: Category,
  observed: Lifecycle = emptyLifecycle(),
): Lifecycle {
  const result = events.reduce(
    (state, event) =>
      transitionLifecycle(state, event.category, event.at, event.fromCategory),
    emptyLifecycle(),
  );
  // A historical start may predate live tracking; a newer live terminal event
  // may not yet appear in activity. Preserve both without keeping stale dates.
  const startedAt =
    result.startedAt && observed.startedAt
      ? new Date(
          Math.min(result.startedAt.getTime(), observed.startedAt.getTime()),
        )
      : (result.startedAt ?? observed.startedAt);
  const latest = (historical: Date | null, live: Date | null) => {
    if (!historical) return live;
    if (!live) return historical;
    return historical > live ? historical : live;
  };
  return {
    startedAt,
    completedAt:
      current === "completed"
        ? latest(result.completedAt, observed.completedAt)
        : null,
    canceledAt:
      current === "canceled"
        ? latest(result.canceledAt, observed.canceledAt)
        : null,
  };
}

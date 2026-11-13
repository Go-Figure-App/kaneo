import type { Cycle } from "./types";

export function sortCycleOptions<
  T extends Pick<Cycle, "phase" | "startsAt" | "number">,
>(cycles: T[]) {
  const order = { current: 0, upcoming: 1, past: 2 };
  return [...cycles].sort(
    (left, right) =>
      order[left.phase] - order[right.phase] ||
      (left.phase === "upcoming"
        ? left.startsAt.localeCompare(right.startsAt)
        : right.startsAt.localeCompare(left.startsAt)) ||
      right.number - left.number,
  );
}

import { describe, expect, it } from "vite-plus/test";
import { defaultCategory } from "./categories";
import { enabledFeatures } from "./features";
import {
  emptyLifecycle,
  replayLifecycle,
  transitionLifecycle,
} from "./lifecycle";

describe("planning foundation", () => {
  it("defaults off and enables the foundation for recognized feature flags", () => {
    expect(enabledFeatures("")).toEqual([]);
    expect(enabledFeatures("not-a-feature")).toEqual([]);
    expect(enabledFeatures(" cycles,triage,cycles ")).toEqual([
      "foundation",
      "triage",
      "cycles",
    ]);
  });
  it("uses final flags and conventional slugs without guessing custom states", () => {
    expect(defaultCategory("shipped", true)).toBe("completed");
    expect(defaultCategory("canceled", true)).toBe("canceled");
    expect(defaultCategory("in-progress")).toBe("started");
    expect(defaultCategory("backlog")).toBe("backlog");
    expect(defaultCategory("needs-design")).toBe("unstarted");
  });
  it("preserves the first start, clears terminal dates on reopening and records recompletion", () => {
    const first = new Date("2026-01-01T00:00:00Z");
    const second = new Date("2026-01-02T00:00:00Z");
    const third = new Date("2026-01-03T00:00:00Z");
    const started = transitionLifecycle(emptyLifecycle(), "started", first);
    const completed = transitionLifecycle(started, "completed", second);
    expect(transitionLifecycle(completed, "completed", third)).toEqual(
      completed,
    );
    const reopened = transitionLifecycle(completed, "started", third);
    expect(reopened).toEqual({
      startedAt: first,
      completedAt: null,
      canceledAt: null,
    });
    expect(transitionLifecycle(reopened, "canceled", third)).toEqual({
      startedAt: first,
      completedAt: null,
      canceledAt: third,
    });
    expect(
      transitionLifecycle(reopened, "completed", third).completedAt,
    ).toEqual(third);
  });
  it("does not invent historical timestamps or leave stale completion on an open task", () => {
    expect(replayLifecycle([], "completed")).toEqual(emptyLifecycle());
    expect(
      replayLifecycle([{ category: "completed", at: new Date() }], "unstarted")
        .completedAt,
    ).toBeNull();
  });
});

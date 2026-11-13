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
    expect(enabledFeatures("initiatives")).toEqual([
      "foundation",
      "projects",
      "initiatives",
    ]);
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
  it("only advances a terminal timestamp when a transition enters its category", () => {
    const first = new Date("2026-01-01T00:00:00Z");
    const second = new Date("2026-01-02T00:00:00Z");
    for (const category of ["completed", "canceled"] as const) {
      const observed = transitionLifecycle(emptyLifecycle(), category, first);
      expect(
        replayLifecycle(
          [{ category, fromCategory: category, at: second }],
          category,
          observed,
        ),
      ).toEqual(observed);
      expect(
        replayLifecycle(
          [{ category, fromCategory: "started", at: second }],
          category,
          observed,
        ),
      ).toEqual(transitionLifecycle(emptyLifecycle(), category, second));
    }
  });
  it("recovers an earlier historical start and a missed recompletion while retaining newer live observations", () => {
    const first = new Date("2026-01-01T00:00:00Z");
    const second = new Date("2026-01-02T00:00:00Z");
    const third = new Date("2026-01-03T00:00:00Z");
    const fourth = new Date("2026-01-04T00:00:00Z");
    const fifth = new Date("2026-01-05T00:00:00Z");
    const events = [
      { category: "started" as const, at: first },
      { category: "completed" as const, at: second },
      { category: "started" as const, at: third },
      { category: "completed" as const, at: fourth },
    ];
    const observed = {
      startedAt: third,
      completedAt: second,
      canceledAt: null,
    };
    expect(replayLifecycle(events, "completed", observed)).toEqual({
      startedAt: first,
      completedAt: fourth,
      canceledAt: null,
    });
    expect(
      replayLifecycle(events, "completed", { ...observed, completedAt: fifth })
        .completedAt,
    ).toEqual(fifth);
    expect(
      replayLifecycle(events, "unstarted", observed).completedAt,
    ).toBeNull();
  });
});

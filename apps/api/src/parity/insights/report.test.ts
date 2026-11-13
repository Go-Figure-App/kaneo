import { afterEach, expect, it } from "vite-plus/test";
import {
  cacheInsights,
  cachedInsights,
  insightsRevision,
  invalidateInsights,
} from "./cache";
import { reportRange, reportSlice } from "./range";
import { insightsQuery, type Insights } from "./schema";
import { stateDurations } from "./state-history";

afterEach(() => invalidateInsights());
it("uses local inclusive dates through daylight saving and validates ranges and slices", () => {
  const range = reportRange(
    { measure: "throughput", from: "2026-11-01", to: "2026-11-01" },
    "America/New_York",
  );
  expect((+range.endsAt - +range.startsAt) / 3_600_000).toBe(25);
  expect(() =>
    reportRange(
      { measure: "throughput", from: "2026-11-02", to: "2026-11-01" },
      "UTC",
    ),
  ).toThrow();
  expect(() =>
    reportRange(
      { measure: "throughput", from: "2020-01-01", to: "2026-11-01" },
      "UTC",
    ),
  ).toThrow();
  expect(() =>
    reportRange(
      { measure: "throughput", from: "2026-02-31", to: "2026-03-03" },
      "UTC",
    ),
  ).toThrow();
  expect(
    insightsQuery.safeParse({ measure: "throughput", typo: true }).success,
  ).toBe(false);
  expect(() =>
    reportSlice({ measure: "velocity", assigneeId: "person" }),
  ).toThrow();
  expect(() => reportSlice({ measure: "burndown" })).toThrow();
  expect(reportSlice({ measure: "workload" })).toBe("assignee");
});

it("expires cached reports, isolates returned values and records invalidation during computation", () => {
  const result: Insights = {
    measure: "throughput",
    slice: "week",
    from: "2026-11-01",
    to: "2026-11-13",
    timeZone: "UTC",
    estimates: true,
    rows: [],
    historyAvailable: true,
    partialHistory: false,
  };
  cacheInsights("one", "workspace", result, 1000);
  result.partialHistory = true;
  expect(cachedInsights("one", 1001)?.partialHistory).toBe(false);
  expect(cachedInsights("one", 61_000)).toBeUndefined();
  cacheInsights("one", "workspace", result, 1000);
  const before = insightsRevision();
  invalidateInsights("workspace");
  expect(insightsRevision()).toBeGreaterThan(before);
  expect(cachedInsights("one", 1001)).toBeUndefined();
});

it("sums recorded state intervals per task, clips the range and omits inaccessible project history", () => {
  const date = (day: number) =>
    new Date(`2026-11-${String(day).padStart(2, "0")}T00:00:00Z`);
  const task = { projectId: "visible", createdAt: date(1), status: "done" };
  const activities = [
    {
      type: "status_changed",
      createdAt: date(3),
      eventData: { oldStatus: "to-do", newStatus: "in-progress" },
    },
    {
      type: "moved",
      createdAt: date(5),
      eventData: {
        fromProjectId: "hidden",
        toProjectId: "visible",
        oldStatus: "in-progress",
        newStatus: "in-progress",
      },
    },
    {
      type: "status_changed",
      createdAt: date(8),
      eventData: { oldStatus: "in-progress", newStatus: "done" },
    },
  ];
  const result = stateDurations(
    task,
    activities,
    [{ projectId: "visible", slug: "done", isFinal: true, category: null }],
    new Set(["visible"]),
    date(4),
    date(10),
    date(13),
  );
  expect(Object.fromEntries(result.totals)).toEqual({
    started: 3,
    completed: 2,
  });
  expect(
    stateDurations(
      task,
      [],
      [],
      new Set(["visible"]),
      date(1),
      date(10),
      date(13),
    ),
  ).toEqual({ totals: new Map(), missing: true });
  const incomplete = stateDurations(
    task,
    [
      {
        type: "status_changed",
        createdAt: date(3),
        eventData: { oldStatus: "to-do", newStatus: "in-progress" },
      },
    ],
    [],
    new Set(["visible"]),
    date(1),
    date(10),
    date(13),
  );
  expect(Object.fromEntries(incomplete.totals)).toEqual({ unstarted: 2 });
  expect(incomplete.missing).toBe(true);
});

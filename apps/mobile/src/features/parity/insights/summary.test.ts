import { beforeEach, expect, it, vi } from "vite-plus/test";
const request = vi.hoisted(() => vi.fn().mockResolvedValue({}));
vi.mock("@/lib/api/client", () => ({ request }));
import { insightsApi, type InsightReport } from "./api";
import { insightValue, throughputBars } from "./summary";

const report: InsightReport = {
  measure: "throughput",
  slice: "week",
  from: "2026-11-01",
  to: "2026-11-15",
  timeZone: "UTC",
  estimates: true,
  historyAvailable: true,
  partialHistory: false,
  rows: [
    {
      key: "2026-11-02",
      label: null,
      series: "total",
      value: 0,
      points: 0,
      samples: 0,
    },
    {
      key: "2026-11-09",
      label: null,
      series: "total",
      value: 2,
      points: 5,
      samples: 2,
    },
  ],
};
beforeEach(() => request.mockClear());
it("sends encoded workspace IDs and the correct cycle scope for each card", async () => {
  for (const measure of ["throughput", "velocity", "cycle-time"] as const) {
    await insightsApi.report("work/space", "cycle/one", measure);
    expect(request).toHaveBeenLastCalledWith(
      "api/parity/insights/work%2Fspace",
      {
        query: {
          cycleId: "cycle/one",
          measure,
          slice: measure === "throughput" ? "week" : "cycle",
        },
      },
    );
  }
});
it("keeps missing history separate from zero and sums only the selected series", () => {
  expect(insightValue(undefined, "total")).toBeNull();
  expect(
    insightValue({ ...report, historyAvailable: false }, "total"),
  ).toBeNull();
  expect(insightValue(report, "median")).toBeNull();
  expect(insightValue(report, "total")).toBe(2);
  expect(insightValue(report, "total", true)).toBe(5);
  expect(
    insightValue({ ...report, rows: [report.rows[0]!] }, "total", true),
  ).toBe(0);
  expect(
    insightValue(
      { ...report, rows: [{ ...report.rows[0]!, points: null }] },
      "total",
      true,
    ),
  ).toBeNull();
});
it("normalizes weekly bars without overflowing or dividing an empty series by zero", () => {
  const bars = throughputBars(report);
  expect(bars.map((bar) => bar.height)).toEqual([0, 50]);
  expect(bars.every((bar) => bar.x + bar.width <= 300)).toBe(true);
  expect(throughputBars({ ...report, rows: [] })).toEqual([]);
  expect(
    throughputBars({ ...report, rows: [report.rows[0]!] })[0]?.height,
  ).toBe(0);
});

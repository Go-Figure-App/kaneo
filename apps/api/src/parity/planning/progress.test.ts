import { describe, expect, it } from "vite-plus/test";
import { addCounts, emptyCounts, progress } from "./progress";

describe("planning progress", () => {
  it("keeps an empty project at zero and omits points when estimates are off", () => {
    expect(progress(emptyCounts(), false)).toEqual({
      completed: 0,
      total: 0,
      percent: 0,
      completedPoints: null,
      totalPoints: null,
      pointsPercent: null,
    });
  });
  it("weights initiative progress by tasks rather than averaging percentages", () => {
    const totals = addCounts([
      { completed: 1, total: 1, completedPoints: 8, totalPoints: 8 },
      { completed: 1, total: 9, completedPoints: 1, totalPoints: 16 },
    ]);
    expect(progress(totals, true)).toEqual({
      completed: 2,
      total: 10,
      percent: 20,
      completedPoints: 9,
      totalPoints: 24,
      pointsPercent: 37.5,
    });
  });
  it("handles zero estimates without dividing by zero", () => {
    expect(
      progress(
        { total: 3, completed: 1, totalPoints: 0, completedPoints: 0 },
        true,
      ),
    ).toMatchObject({ percent: 33.33, pointsPercent: 0 });
  });
});

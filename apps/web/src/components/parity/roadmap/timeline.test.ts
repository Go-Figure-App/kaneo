import { parseISO } from "date-fns";
import { afterEach, expect, it, vi } from "vite-plus/test";
import {
  dateAtX,
  dateOffset,
  editDates,
  navigateWindow,
  scheduled,
  shiftDate,
  timelineWindow,
  zooms,
} from "./timeline";

afterEach(() => vi.unstubAllEnvs());
it("bounds every zoom before allocating dates, including extreme imported years", () => {
  for (const anchor of ["0001-01-01", "2024-02-29", "9999-12-31"])
    for (const zoom of zooms) {
      const window = timelineWindow(parseISO(anchor), zoom);
      expect(window.days.length).toBeGreaterThan(0);
      expect(window.days.length).toBeLessThanOrEqual(366);
      expect(window.start.getFullYear()).toBeGreaterThanOrEqual(1);
      expect(window.end.getFullYear()).toBeLessThanOrEqual(9999);
    }
  expect(timelineWindow(parseISO("2024-02-29"), "year").days).toHaveLength(366);
});
it("moves calendar days across daylight saving without changing the duration", () => {
  vi.stubEnv("TZ", "America/Los_Angeles");
  expect(editDates("2026-03-07", "2026-03-10", "move", 1)).toEqual({
    startDate: "2026-03-08",
    targetDate: "2026-03-11",
  });
  const window = timelineWindow(parseISO("2026-03-08"), "month");
  expect(dateOffset(parseISO("2026-03-10"), window)).toBe(9 * window.dayWidth);
});
it("clamps resize handles and whole-bar moves without crossing dates or supported years", () => {
  expect(editDates("2026-11-01", "2026-11-05", "start", 20)).toEqual({
    startDate: "2026-11-05",
    targetDate: "2026-11-05",
  });
  expect(editDates("2026-11-01", "2026-11-05", "end", -20)).toEqual({
    startDate: "2026-11-01",
    targetDate: "2026-11-01",
  });
  expect(editDates("9999-12-28", "9999-12-30", "move", 1e20)).toEqual({
    startDate: "9999-12-29",
    targetDate: "9999-12-31",
  });
  expect(shiftDate("2026-11-01", -1e20)).toBe("0001-01-01");
  expect(editDates("2026-11-01", "2026-11-05", "end", 1e20)?.targetDate).toBe(
    "9999-12-31",
  );
});
it("keeps incomplete or invalid schedules out of the timeline and clamps drops", () => {
  expect(scheduled(null, "2026-11-01")).toBeNull();
  expect(scheduled("2026-11-02", "2026-11-01")).toBeNull();
  expect(scheduled("invalid", "2026-11-01")).toBeNull();
  expect(editDates(null, null, "move", 1)).toBeNull();
  expect(shiftDate("2026-11-01", Infinity)).toBeNull();
  const window = timelineWindow(parseISO("2026-11-13"), "month");
  expect(dateAtX(-100, window)).toBe("2026-11-01");
  expect(dateAtX(window.width + 100, window)).toBe("2026-11-30");
  expect(navigateWindow(parseISO("9999-12-31"), "year", 1).getFullYear()).toBe(
    9999,
  );
});

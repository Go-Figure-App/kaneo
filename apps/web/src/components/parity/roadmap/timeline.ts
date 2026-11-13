import {
  addDays,
  addMonths,
  addWeeks,
  addYears,
  differenceInCalendarDays,
  eachDayOfInterval,
  endOfMonth,
  endOfQuarter,
  endOfWeek,
  endOfYear,
  format,
  startOfMonth,
  startOfQuarter,
  startOfWeek,
  startOfYear,
} from "date-fns";
import { parseTaskDate } from "@/components/gantt/timeline";

export const zooms = ["week", "month", "quarter", "year"] as const;
export type Zoom = (typeof zooms)[number];
export type DateEdit = "move" | "start" | "end";
const minimum = parseTaskDate("0001-01-01")!;
const maximum = parseTaskDate("9999-12-31")!;
const bounded = (date: Date) =>
  new Date(Math.max(+minimum, Math.min(+maximum, +date)));
export const dateValue = (date: Date) => format(date, "yyyy-MM-dd");
export function scheduled(start: string | null, end: string | null) {
  const from = parseTaskDate(start),
    to = parseTaskDate(end);
  return from && to && from <= to ? { start: from, end: to } : null;
}
export function timelineWindow(anchor: Date, zoom: Zoom) {
  const safe = Number.isFinite(+anchor) ? bounded(anchor) : new Date();
  const starts = {
    week: startOfWeek,
    month: startOfMonth,
    quarter: startOfQuarter,
    year: startOfYear,
  };
  const ends = {
    week: endOfWeek,
    month: endOfMonth,
    quarter: endOfQuarter,
    year: endOfYear,
  };
  const start = bounded(starts[zoom](safe, { weekStartsOn: 1 }));
  const end = bounded(ends[zoom](safe, { weekStartsOn: 1 }));
  const days = eachDayOfInterval({ start, end });
  const dayWidth = { week: 112, month: 36, quarter: 14, year: 4 }[zoom];
  return { start, end, days, dayWidth, width: days.length * dayWidth };
}
export type TimelineWindow = ReturnType<typeof timelineWindow>;
export function navigateWindow(anchor: Date, zoom: Zoom, offset: number) {
  return bounded(
    zoom === "week"
      ? addWeeks(anchor, offset)
      : zoom === "year"
        ? addYears(anchor, offset)
        : addMonths(anchor, offset * (zoom === "quarter" ? 3 : 1)),
  );
}
export function shiftDate(value: string, offset: number) {
  const date = parseTaskDate(value);
  return date && Number.isFinite(offset)
    ? dateValue(
        addDays(
          date,
          Math.max(
            differenceInCalendarDays(minimum, date),
            Math.min(
              differenceInCalendarDays(maximum, date),
              Math.round(offset),
            ),
          ),
        ),
      )
    : null;
}
export function editDates(
  startDate: string | null,
  targetDate: string | null,
  kind: DateEdit,
  offset: number,
) {
  const range = scheduled(startDate, targetDate);
  if (!range || !Number.isFinite(offset)) return null;
  let days = Math.round(offset);
  if (kind === "move") {
    days = Math.max(
      differenceInCalendarDays(minimum, range.start),
      Math.min(differenceInCalendarDays(maximum, range.end), days),
    );
    return {
      startDate: dateValue(addDays(range.start, days)),
      targetDate: dateValue(addDays(range.end, days)),
    };
  }
  return kind === "start"
    ? {
        startDate: shiftDate(
          startDate!,
          Math.min(differenceInCalendarDays(range.end, range.start), days),
        )!,
        targetDate: targetDate!,
      }
    : {
        startDate: startDate!,
        targetDate: shiftDate(
          targetDate!,
          Math.max(differenceInCalendarDays(range.start, range.end), days),
        )!,
      };
}
export function dateOffset(date: Date, window: TimelineWindow) {
  return differenceInCalendarDays(date, window.start) * window.dayWidth;
}
export function dateAtX(x: number, window: TimelineWindow) {
  const offset = Math.max(
    0,
    Math.min(window.days.length - 1, Math.floor(x / window.dayWidth)),
  );
  return dateValue(addDays(window.start, offset));
}

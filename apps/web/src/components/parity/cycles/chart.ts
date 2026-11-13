import type { CycleDetail } from "@/fetchers/parity/cycles";

export function calendarDay(value: string | Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(value));
  const part = (type: string) =>
    parts.find((part) => part.type === type)!.value;
  return `${part("year").padStart(4, "0")}-${part("month")}-${part("day")}`;
}
const dayNumber = (day: string) => Date.parse(`${day}T00:00:00Z`) / 86_400_000;
export function daysLeft(endsAt: string, timeZone: string, now = new Date()) {
  return Math.max(
    0,
    dayNumber(calendarDay(endsAt, timeZone)) -
      dayNumber(calendarDay(now, timeZone)),
  );
}
export function completion(
  totals: CycleDetail["progress"],
  estimates: boolean,
) {
  const points = estimates && totals.scopePoints > 0;
  const total = points ? totals.scopePoints : totals.scopeCount;
  const done = points ? totals.completedPoints : totals.completedCount;
  return total ? Math.round((done / total) * 100) : 0;
}
export function burndown(cycle: CycleDetail, now = new Date()) {
  const points = cycle.settings.estimateScale !== "none";
  const timezone = cycle.settings.timeZone;
  const start = dayNumber(calendarDay(cycle.startsAt, timezone));
  const end = dayNumber(calendarDay(cycle.endsAt, timezone));
  const duration = Math.max(1, end - start);
  const rows = new Map(cycle.days.map((day) => [day.day, day]));
  if (cycle.phase === "current")
    rows.set(calendarDay(now, timezone), {
      day: calendarDay(now, timezone),
      ...cycle.progress,
    });
  if (cycle.summary && cycle.completedAt)
    rows.set(calendarDay(cycle.completedAt, timezone), {
      day: calendarDay(cycle.completedAt, timezone),
      ...cycle.summary,
    });
  const observed = [...rows.values()]
    .sort((a, b) => a.day.localeCompare(b.day))
    .map((row) => ({
      day: row.day,
      x: Math.min(1, Math.max(0, (dayNumber(row.day) - start) / duration)),
      scope: points ? row.scopePoints : row.scopeCount,
      remaining: Math.max(
        0,
        points
          ? row.scopePoints - row.completedPoints
          : row.scopeCount - row.completedCount,
      ),
    }));
  const maximum = Math.max(1, ...observed.map((row) => row.scope));
  return {
    observed,
    maximum,
    initial: observed[0]?.scope ?? 0,
    startDay: calendarDay(cycle.startsAt, timezone),
    endDay: calendarDay(cycle.endsAt, timezone),
  };
}

export function formatCalendarDay(day: string, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${day}T00:00:00Z`));
}

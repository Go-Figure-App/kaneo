import { TZDate } from "@date-fns/tz";
import { addWeeks, format, startOfDay, startOfWeek } from "date-fns";

export type Cadence = {
  cycleWeeks: number;
  cooldownWeeks: number;
  cycleStartDay: 0 | 1 | 2 | 3 | 4 | 5 | 6;
};
export function validTimeZone(value: string) {
  if (/^[+-]/.test(value)) return false;
  try {
    new Intl.DateTimeFormat("en", { timeZone: value }).format(0);
    return true;
  } catch {
    return false;
  }
}
function supportedDate(value: Date) {
  if (
    !Number.isFinite(+value) ||
    value.getUTCFullYear() < 1 ||
    value.getUTCFullYear() > 9999
  )
    throw new RangeError("Cycle dates must be within years 0001–9999");
  return new Date(+value);
}
export function localDay(value: Date, timeZone: string) {
  return format(new TZDate(value, timeZone), "yyyy-MM-dd");
}
export function localMidnight(value: string, timeZone: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || !validTimeZone(timeZone))
    throw new RangeError("Invalid cycle date or time zone");
  const year = Number(value.slice(0, 4));
  const month = Number(value.slice(5, 7));
  const day = Number(value.slice(8, 10));
  const date = new TZDate(0, timeZone);
  date.setFullYear(year, month - 1, day);
  date.setHours(0, 0, 0, 0);
  if (localDay(date, timeZone) !== value)
    throw new RangeError("Invalid local calendar date");
  return supportedDate(date);
}
export function cycleRange(startsAt: Date, weeks: number, timeZone: string) {
  if (!Number.isInteger(weeks) || weeks < 1 || weeks > 8)
    throw new RangeError("A cycle must last between one and eight weeks");
  const start = startOfDay(new TZDate(startsAt, timeZone));
  return {
    startsAt: supportedDate(start),
    // Calendar weeks keep local midnight across daylight-saving transitions.
    endsAt: supportedDate(addWeeks(start, weeks)),
  };
}
export function initialCycle(now: Date, cadence: Cadence, timeZone: string) {
  return cycleRange(
    startOfWeek(new TZDate(now, timeZone), {
      weekStartsOn: cadence.cycleStartDay,
    }),
    cadence.cycleWeeks,
    timeZone,
  );
}
export function followingCycle(
  previousEnd: Date,
  cadence: Cadence,
  timeZone: string,
) {
  if (
    !Number.isInteger(cadence.cooldownWeeks) ||
    cadence.cooldownWeeks < 0 ||
    cadence.cooldownWeeks > 8
  )
    throw new RangeError("A cooldown must last between zero and eight weeks");
  const earliest = addWeeks(
    new TZDate(previousEnd, timeZone),
    cadence.cooldownWeeks,
  );
  const week = startOfWeek(earliest, { weekStartsOn: cadence.cycleStartDay });
  return cycleRange(
    week < earliest ? addWeeks(week, 1) : week,
    cadence.cycleWeeks,
    timeZone,
  );
}

export function cyclePhase(
  cycle: { startsAt: Date; endsAt: Date; completedAt: Date | null },
  now: Date,
) {
  if (cycle.completedAt || cycle.endsAt <= now) return "past" as const;
  return cycle.startsAt > now ? ("upcoming" as const) : ("current" as const);
}

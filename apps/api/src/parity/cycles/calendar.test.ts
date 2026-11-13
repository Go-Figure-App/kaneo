import { expect, it } from "vite-plus/test";
import {
  cyclePhase,
  followingCycle,
  initialCycle,
  localDay,
  localMidnight,
  validTimeZone,
} from "./calendar";

const cadence = { cycleWeeks: 1, cooldownWeeks: 0, cycleStartDay: 1 as const };
it.each([
  [
    "2026-03-04T12:00:00Z",
    "2026-03-02T05:00:00.000Z",
    "2026-03-09T04:00:00.000Z",
    167,
  ],
  [
    "2026-10-28T12:00:00Z",
    "2026-10-26T04:00:00.000Z",
    "2026-11-02T05:00:00.000Z",
    169,
  ],
])(
  "keeps cycle boundaries at local midnight across DST (%s)",
  (now, start, end, hours) => {
    const cycle = initialCycle(new Date(now), cadence, "America/New_York");
    expect(cycle.startsAt.toISOString()).toBe(start);
    expect(cycle.endsAt.toISOString()).toBe(end);
    expect((+cycle.endsAt - +cycle.startsAt) / 3_600_000).toBe(hours);
    expect(
      followingCycle(cycle.endsAt, cadence, "America/New_York").startsAt,
    ).toEqual(cycle.endsAt);
  },
);
it("respects local weekdays and cooldowns over a year boundary", () => {
  const current = initialCycle(
    new Date("2027-01-01T01:00:00Z"),
    cadence,
    "Pacific/Auckland",
  );
  expect(localDay(current.startsAt, "Pacific/Auckland")).toBe("2026-12-28");
  const next = followingCycle(
    current.endsAt,
    { ...cadence, cycleWeeks: 2, cooldownWeeks: 1 },
    "Pacific/Auckland",
  );
  expect(localDay(next.startsAt, "Pacific/Auckland")).toBe("2027-01-11");
  expect(localDay(next.endsAt, "Pacific/Auckland")).toBe("2027-01-25");
});
it("validates local dates, including early years and skipped calendar days", () => {
  expect(localMidnight("0001-01-01", "UTC").toISOString()).toBe(
    "0001-01-01T00:00:00.000Z",
  );
  expect(() => localMidnight("2026-02-30", "UTC")).toThrow(RangeError);
  expect(() => localMidnight("2011-12-30", "Pacific/Apia")).toThrow(RangeError);
  expect(() => localMidnight("0000-01-01", "UTC")).toThrow(RangeError);
  expect(validTimeZone("America/New_York")).toBe(true);
  expect(validTimeZone("invalid/timezone")).toBe(false);
  expect(validTimeZone("+05:30")).toBe(false);
});
it("aligns a changed start weekday after the previous cycle and cooldown", () => {
  const next = followingCycle(
    new Date("2026-11-16T05:00:00Z"),
    { ...cadence, cycleStartDay: 3, cooldownWeeks: 1 },
    "America/New_York",
  );
  expect(next.startsAt.toISOString()).toBe("2026-11-25T05:00:00.000Z");
  expect(next.endsAt.toISOString()).toBe("2026-12-02T05:00:00.000Z");
});
it("does not overlap the previous cycle when the workspace changes timezone", () => {
  const end = new Date("2026-11-16T05:00:00Z");
  const next = followingCycle(end, cadence, "Asia/Tokyo");
  expect(next.startsAt > end).toBe(true);
  expect(localDay(next.startsAt, "Asia/Tokyo")).toBe("2026-11-23");
});
it("uses an exclusive cycle end and recognizes cycles awaiting the hourly close", () => {
  const now = new Date("2026-11-16T00:00:00Z");
  const past = {
    startsAt: new Date("2026-11-09T00:00:00Z"),
    endsAt: now,
    completedAt: null,
  };
  expect(cyclePhase(past, now)).toBe("past");
  const current = {
    ...past,
    startsAt: now,
    endsAt: new Date("2026-11-23T00:00:00Z"),
  };
  expect(cyclePhase(current, now)).toBe("current");
  expect(cyclePhase({ ...current, completedAt: now }, now)).toBe("past");
  expect(cyclePhase({ ...current, startsAt: new Date(+now + 1) }, now)).toBe(
    "upcoming",
  );
});

it("resolves each boundary independently when the start day skips midnight", () => {
  const sunday = { ...cadence, cycleStartDay: 0 as const };
  const before = initialCycle(
    new Date("2026-09-02T12:00:00Z"),
    sunday,
    "America/Santiago",
  );
  expect(before.endsAt.toISOString()).toBe("2026-09-06T04:00:00.000Z");
  const shifted = followingCycle(before.endsAt, sunday, "America/Santiago");
  expect(shifted.startsAt).toEqual(before.endsAt);
  expect(shifted.endsAt.toISOString()).toBe("2026-09-13T03:00:00.000Z");
  expect(
    followingCycle(shifted.endsAt, sunday, "America/Santiago").startsAt,
  ).toEqual(shifted.endsAt);
  expect(
    followingCycle(
      before.endsAt,
      { ...sunday, cooldownWeeks: 1 },
      "America/Santiago",
    ).startsAt,
  ).toEqual(shifted.endsAt);
});

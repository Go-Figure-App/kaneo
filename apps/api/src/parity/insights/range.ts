import { HTTPException } from "hono/http-exception";
import { localDay, localMidnight } from "../cycles/calendar";
import type { InsightsQuery } from "./schema";

export function shiftDay(day: string, amount: number) {
  const date = new Date(`${day}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
}
export function reportRange(
  query: InsightsQuery,
  timeZone: string,
  now = new Date(),
) {
  const to = query.to ?? localDay(now, timeZone);
  const from = query.from ?? shiftDay(to, -83);
  const days =
    (+new Date(`${to}T00:00:00Z`) - +new Date(`${from}T00:00:00Z`)) /
    86_400_000;
  if (!Number.isFinite(days) || days < 0 || days > 730)
    throw new HTTPException(400, {
      message: "Choose a date range of at most two years",
    });
  try {
    return {
      from,
      to,
      startsAt: localMidnight(from, timeZone),
      endsAt: localMidnight(shiftDay(to, 1), timeZone),
    };
  } catch {
    throw new HTTPException(400, { message: "Invalid report calendar date" });
  }
}
export type ReportRange = ReturnType<typeof reportRange>;

export function reportSlice(query: InsightsQuery) {
  const historical = ["velocity", "burndown", "scope-change"].includes(
    query.measure,
  );
  if (
    historical &&
    (query.assigneeId || (query.slice && query.slice !== "cycle"))
  )
    throw new HTTPException(400, {
      message:
        "Cycle history supports project and initiative filters and the cycle slice; individual assignment history is not recorded",
    });
  if (query.measure === "burndown" && !query.cycleId)
    throw new HTTPException(400, { message: "Choose a cycle for burndown" });
  if (query.measure === "time-in-state" && query.slice)
    throw new HTTPException(400, {
      message: "Time in state is grouped by workflow category",
    });
  return query.measure === "burndown"
    ? ("day" as const)
    : query.measure === "time-in-state"
      ? ("category" as const)
      : historical
        ? ("cycle" as const)
        : (query.slice ??
          (query.measure === "workload"
            ? ("assignee" as const)
            : ("week" as const)));
}

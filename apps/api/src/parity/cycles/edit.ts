import { and, eq, gt, lt, ne } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import db from "../../database";
import { cycleTable } from "../../database/schema-parity";
import type { Actor } from "../planning/access";
import { findCycle, lockCycleWorkspace } from "./access";
import { announceCycleChanges } from "./announce";
import { cycleRange, localMidnight } from "./calendar";
import { getCycle } from "./read";
import type { CyclePatch } from "./schema";
import { cycleSettings } from "./settings-read";

export async function editCycle(
  id: string,
  who: Actor,
  input: CyclePatch,
  now = new Date(),
) {
  const changed = await db.transaction(async (tx) => {
    await lockCycleWorkspace(tx, who.workspaceId);
    const cycle = await findCycle(id, who, tx);
    const settings = await cycleSettings(who.workspaceId, tx);
    const dates = input.startDate !== undefined || input.endDate !== undefined;
    if (dates && (cycle.startsAt <= now || cycle.completedAt))
      throw new HTTPException(400, {
        message: "Only upcoming cycles can be rescheduled",
      });
    let startsAt = cycle.startsAt;
    let endsAt = cycle.endsAt;
    try {
      if (input.startDate)
        startsAt = localMidnight(input.startDate, settings.timeZone);
      if (input.endDate)
        endsAt = localMidnight(input.endDate, settings.timeZone);
      if (
        dates &&
        (startsAt <= now ||
          endsAt <= startsAt ||
          endsAt > cycleRange(startsAt, 8, settings.timeZone).endsAt)
      )
        throw new RangeError();
    } catch {
      throw new HTTPException(400, {
        message: "Choose future cycle dates, lasting at most eight weeks",
      });
    }
    if (dates) {
      const overlap = await tx
        .select({ id: cycleTable.id })
        .from(cycleTable)
        .where(
          and(
            eq(cycleTable.workspaceId, who.workspaceId),
            ne(cycleTable.id, id),
            lt(cycleTable.startsAt, endsAt),
            gt(cycleTable.endsAt, startsAt),
          ),
        )
        .limit(1);
      if (overlap.length)
        throw new HTTPException(400, {
          message: "Cycle dates must not overlap another cycle",
        });
    }
    const name = input.name === undefined ? cycle.name : input.name;
    if (
      name === cycle.name &&
      +startsAt === +cycle.startsAt &&
      +endsAt === +cycle.endsAt
    )
      return false;
    await tx
      .update(cycleTable)
      .set({ name, startsAt, endsAt })
      .where(eq(cycleTable.id, id));
    return true;
  });
  if (changed) await announceCycleChanges(who.workspaceId);
  return getCycle(id, who, now);
}

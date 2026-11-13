import { and, desc, eq, isNull, lte } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import db from "../../database";
import { cycleTable, workspaceExtTable } from "../../database/schema-parity";
import type { Actor, Transaction } from "../planning/access";
import { lockCycleWorkspace } from "./access";
import { advanceCycles } from "./advance";
import { announceCycleChanges } from "./announce";
import { followingCycle } from "./calendar";
import { disableCycles } from "./disable";
import { settingsSchema, type SettingsPatch } from "./schema";
import { cycleSettings } from "./settings-read";

async function rescheduleUpcoming(
  tx: Transaction,
  settings: Awaited<ReturnType<typeof cycleSettings>>,
  now: Date,
) {
  const open = await tx
    .select()
    .from(cycleTable)
    .where(
      and(
        eq(cycleTable.workspaceId, settings.workspaceId),
        isNull(cycleTable.completedAt),
      ),
    )
    .orderBy(cycleTable.startsAt);
  const [last] = await tx
    .select()
    .from(cycleTable)
    .where(
      and(
        eq(cycleTable.workspaceId, settings.workspaceId),
        lte(cycleTable.startsAt, now),
      ),
    )
    .orderBy(desc(cycleTable.startsAt))
    .limit(1);
  let previousEnd = last?.endsAt ?? now;
  for (const cycle of open.filter((cycle) => cycle.startsAt > now)) {
    let range = followingCycle(previousEnd, settings, settings.timeZone);
    if (range.startsAt < now)
      range = followingCycle(
        now,
        { ...settings, cooldownWeeks: 0 },
        settings.timeZone,
      );
    if (+range.startsAt !== +cycle.startsAt || +range.endsAt !== +cycle.endsAt)
      await tx.update(cycleTable).set(range).where(eq(cycleTable.id, cycle.id));
    previousEnd = range.endsAt;
  }
}

export async function updateCycleSettings(
  who: Actor,
  input: SettingsPatch,
  now = new Date(),
) {
  const result = await db.transaction(async (tx) => {
    await lockCycleWorkspace(tx, who.workspaceId);
    const before = await cycleSettings(who.workspaceId, tx);
    const next = {
      ...before,
      ...input,
      cycleStartDay: (input.cycleStartDay ??
        before.cycleStartDay) as typeof before.cycleStartDay,
    };
    if (!settingsSchema.safeParse(next).success)
      throw new HTTPException(400, { message: "Invalid cycle settings" });
    if (
      !Object.entries(input).some(
        ([key, value]) => value !== before[key as keyof typeof before],
      )
    )
      return { changed: false, tasks: [] };
    await tx.insert(workspaceExtTable).values(next).onConflictDoUpdate({
      target: workspaceExtTable.workspaceId,
      set: input,
    });
    const tasks: { taskId: string; projectId: string }[] = !next.cyclesEnabled
      ? await disableCycles(tx, who, before.estimateScale, now)
      : [];
    if (next.cyclesEnabled) {
      const cadenceChanged = (
        ["cycleWeeks", "cooldownWeeks", "cycleStartDay", "timeZone"] as const
      ).some((key) => before[key] !== next[key]);
      if (cadenceChanged) await rescheduleUpcoming(tx, next, now);
      const advanced = await advanceCycles(tx, next, now);
      tasks.push(...advanced.rolledOver);
    }
    return { changed: true, tasks };
  });
  if (result.changed) await announceCycleChanges(who.workspaceId, result.tasks);
  return cycleSettings(who.workspaceId);
}

import { and, desc, eq, isNull } from "drizzle-orm";
import { cycleTable } from "../../database/schema-parity";
import type { Transaction } from "../planning/access";
import { followingCycle, initialCycle } from "./calendar";
import { closeCycle } from "./close";
import type { cycleSettings } from "./settings-read";
import { snapshotCycle } from "./snapshot";

type Settings = Awaited<ReturnType<typeof cycleSettings>>;
type Cycle = typeof cycleTable.$inferSelect;

// The caller holds lockCycleWorkspace for the entire transaction.
export async function advanceCycles(
  tx: Transaction,
  settings: Settings,
  now: Date,
) {
  const { timeZone } = settings;
  const result = {
    changed: false,
    catchingUp: false,
    rolledOver: [] as { taskId: string; projectId: string }[],
  };
  if (!settings.cyclesEnabled) return result;
  const open = await tx
    .select()
    .from(cycleTable)
    .where(
      and(
        eq(cycleTable.workspaceId, settings.workspaceId),
        isNull(cycleTable.completedAt),
      ),
    )
    .orderBy(cycleTable.startsAt, cycleTable.number);
  let [last] = await tx
    .select()
    .from(cycleTable)
    .where(eq(cycleTable.workspaceId, settings.workspaceId))
    .orderBy(desc(cycleTable.number))
    .limit(1);
  const append = async (previous?: Cycle) => {
    const [cycle] = await tx
      .insert(cycleTable)
      .values({
        workspaceId: settings.workspaceId,
        number: (last?.number ?? 0) + 1,
        ...(previous
          ? followingCycle(previous.endsAt, settings, timeZone)
          : initialCycle(now, settings, timeZone)),
      })
      .returning();
    if (!cycle) throw new Error("Could not create the next cycle");
    last = cycle;
    open.push(cycle);
    result.changed = true;
    return cycle;
  };
  if (!open.length) {
    const initial = initialCycle(now, settings, timeZone);
    await append(last && last.endsAt > initial.startsAt ? last : undefined);
  }
  // An extended outage is caught up in bounded transactions, without inventing
  // historical daily snapshots. The next hourly tick resumes from persisted rows.
  let closed = 0;
  while (open[0] && open[0].endsAt <= now && closed < 64) {
    const cycle = open[0];
    const next = open[1] ?? (await append(cycle));
    result.rolledOver.push(
      ...(await closeCycle(
        tx,
        cycle,
        settings.autoRollover ? next : null,
        settings.estimateScale,
        now,
      )),
    );
    open.shift();
    result.changed = true;
    closed++;
  }
  if (open[0] && open[0].endsAt <= now) {
    result.catchingUp = true;
    return result;
  }
  while (
    open.filter((cycle) => cycle.startsAt > now).length <
    settings.upcomingCycles
  )
    await append(open.at(-1));
  const current = open.find(
    (cycle) => cycle.startsAt <= now && now < cycle.endsAt,
  );
  if (
    current &&
    (await snapshotCycle(
      tx,
      current,
      settings.estimateScale !== "none",
      timeZone,
      now,
    ))
  )
    result.changed = true;
  return result;
}

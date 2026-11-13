import { and, eq, inArray, isNull } from "drizzle-orm";
import { activityTable, projectTable, taskTable } from "../../database/schema";
import { cycleTable, taskExtTable } from "../../database/schema-parity";
import type { Actor, Transaction } from "../planning/access";
import { closeCycle } from "./close";
import type { EstimateScale } from "./estimates";

export async function disableCycles(
  tx: Transaction,
  who: Actor,
  scale: EstimateScale,
  now: Date,
) {
  const open = await tx
    .select()
    .from(cycleTable)
    .where(
      and(
        eq(cycleTable.workspaceId, who.workspaceId),
        isNull(cycleTable.completedAt),
      ),
    )
    .orderBy(cycleTable.number);
  await tx
    .select({ id: projectTable.id })
    .from(projectTable)
    .where(eq(projectTable.workspaceId, who.workspaceId))
    .orderBy(projectTable.id)
    .for("update");
  for (const cycle of open.filter((cycle) => cycle.startsAt <= now))
    await closeCycle(tx, cycle, null, scale, now);
  const futureIds = open
    .filter((cycle) => cycle.startsAt > now)
    .map((cycle) => cycle.id);
  if (!futureIds.length) return [];
  const tasks = await tx
    .select({
      taskId: taskTable.id,
      projectId: taskTable.projectId,
      cycleId: taskExtTable.cycleId,
    })
    .from(taskTable)
    .innerJoin(projectTable, eq(projectTable.id, taskTable.projectId))
    .innerJoin(taskExtTable, eq(taskExtTable.taskId, taskTable.id))
    .where(
      and(
        eq(projectTable.workspaceId, who.workspaceId),
        inArray(taskExtTable.cycleId, futureIds),
      ),
    )
    .orderBy(taskTable.id)
    .for("update", { of: taskTable });
  for (let offset = 0; offset < tasks.length; offset += 200) {
    const batch = tasks.slice(offset, offset + 200);
    await tx
      .update(taskExtTable)
      .set({ cycleId: null })
      .where(
        inArray(
          taskExtTable.taskId,
          batch.map((task) => task.taskId),
        ),
      );
    await tx.insert(activityTable).values(
      batch.map((task) => ({
        taskId: task.taskId,
        userId: who.userId,
        type: "cycle_changed",
        eventData: {
          oldCycleId: task.cycleId,
          cycleId: null,
          reason: "cycles_disabled",
        },
      })),
    );
  }
  await tx.delete(cycleTable).where(inArray(cycleTable.id, futureIds));
  return tasks;
}

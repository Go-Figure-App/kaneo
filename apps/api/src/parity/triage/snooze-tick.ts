import { and, eq, inArray, isNotNull, lte } from "drizzle-orm";
import db from "../../database";
import { projectTable, taskTable } from "../../database/schema";
import { taskExtTable } from "../../database/schema-parity";
import { publishEvent } from "../../events";
import { withJobLease } from "../../scheduler/leader-lock";
import { enabledFeatures } from "../foundation/features";

export async function wakeSnoozedTriage() {
  if (!enabledFeatures().includes("triage")) return;
  return withJobLease(
    "parity-triage-snooze",
    async () => {
      // One bounded batch per tick; due items are also visible to reads immediately.
      const due = await db
        .select({ taskId: taskExtTable.taskId })
        .from(taskExtTable)
        .where(
          and(
            eq(taskExtTable.triageState, "pending"),
            isNotNull(taskExtTable.snoozedUntil),
            lte(taskExtTable.snoozedUntil, new Date()),
          ),
        )
        .orderBy(taskExtTable.snoozedUntil, taskExtTable.taskId)
        .limit(500);
      if (!due.length) return;
      const woken = await db
        .update(taskExtTable)
        .set({ snoozedUntil: null })
        .where(
          and(
            inArray(
              taskExtTable.taskId,
              due.map((item) => item.taskId),
            ),
            eq(taskExtTable.triageState, "pending"),
            lte(taskExtTable.snoozedUntil, new Date()),
          ),
        )
        .returning({ taskId: taskExtTable.taskId });
      if (!woken.length) return;
      const projects = await db
        .selectDistinct({
          projectId: projectTable.id,
          workspaceId: projectTable.workspaceId,
        })
        .from(taskTable)
        .innerJoin(projectTable, eq(projectTable.id, taskTable.projectId))
        .where(
          inArray(
            taskTable.id,
            woken.map((item) => item.taskId),
          ),
        );
      for (const project of projects)
        await publishEvent("parity.workspace_updated", {
          type: "TRIAGE_UPDATED",
          ...project,
        });
    },
    () => undefined,
  );
}

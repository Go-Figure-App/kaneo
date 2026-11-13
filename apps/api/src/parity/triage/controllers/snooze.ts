import { eq } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import { activityTable } from "../../../database/schema";
import { taskExtTable } from "../../../database/schema-parity";
import { publishEvent } from "../../../events";
import { withPendingTask, type TriageActor } from "./with-pending-task";

export async function snoozeTriage(
  taskId: string,
  actor: TriageActor,
  until: Date,
) {
  const delta = until.getTime() - Date.now();
  if (
    !Number.isFinite(delta) ||
    delta <= 0 ||
    delta > 365 * 24 * 60 * 60 * 1000
  )
    throw new HTTPException(400, {
      message: "Snooze until a future date within one year",
    });
  const { before } = await withPendingTask(taskId, actor, async (tx) => {
    await tx
      .update(taskExtTable)
      .set({ snoozedUntil: until })
      .where(eq(taskExtTable.taskId, taskId));
    await tx.insert(activityTable).values({
      taskId,
      userId: actor.userId,
      type: "triage_snoozed",
      eventData: { until: until.toISOString() },
    });
  });
  await publishEvent("parity.workspace_updated", {
    type: "TRIAGE_UPDATED",
    workspaceId: actor.workspaceId,
    projectId: before.projectId,
  });
  return { id: taskId };
}

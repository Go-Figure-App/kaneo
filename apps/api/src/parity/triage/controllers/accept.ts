import { and, eq } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import {
  activityTable,
  columnTable,
  taskTable,
} from "../../../database/schema";
import { taskExtTable } from "../../../database/schema-parity";
import { publishEvent } from "../../../events";
import { nextTaskPosition } from "../../../task/controllers/next-task-position";
import { publishTaskMutation } from "../../../task/controllers/task-mutation-effects";
import { assertAssignableUser } from "../../../utils/assert-assignable-user";
import type { AcceptInput } from "../schema";
import { withPendingTask, type TriageActor } from "./with-pending-task";
import { prepareAcceptedFields } from "./accept-fields";
import { validateCycleAssignment } from "../../cycles/task-write";

export async function acceptTriage(
  taskId: string,
  actor: TriageActor,
  input: AcceptInput,
) {
  const { before, result } = await withPendingTask(
    taskId,
    actor,
    async (tx, task, ext) => {
      if (input.cycleId !== undefined)
        await validateCycleAssignment(tx, actor.workspaceId, input.cycleId);
      const [column] = await tx
        .select()
        .from(columnTable)
        .where(
          and(
            eq(columnTable.id, input.columnId),
            eq(columnTable.projectId, task.projectId),
          ),
        )
        .for("share");
      if (!column)
        throw new HTTPException(400, {
          message: "Choose a column from this project",
        });
      if (task.recurrence && column.isFinal)
        throw new HTTPException(400, {
          message: "Accept a repeating task into an open column",
        });
      const assigneeId =
        input.assigneeId === undefined ? task.userId : input.assigneeId;
      if (assigneeId)
        await assertAssignableUser(
          assigneeId,
          actor.workspaceId,
          task.projectId,
          tx,
        );
      await prepareAcceptedFields(tx, taskId, task.projectId);
      const [after] = await tx
        .update(taskTable)
        .set({
          status: column.slug,
          columnId: column.id,
          userId: assigneeId,
          priority: input.priority ?? task.priority,
          position: await nextTaskPosition(
            tx,
            task.projectId,
            column.slug,
            column.id,
          ),
        })
        .where(eq(taskTable.id, taskId))
        .returning();
      if (!after) throw new HTTPException(404, { message: "Task not found" });
      await tx
        .update(taskExtTable)
        .set({
          triageState: "accepted",
          triagedBy: actor.userId,
          triagedAt: new Date(),
          snoozedUntil: null,
          ...(input.cycleId === undefined ? {} : { cycleId: input.cycleId }),
        })
        .where(eq(taskExtTable.taskId, taskId));
      await tx.insert(activityTable).values({
        taskId,
        userId: actor.userId,
        type: "triage_accepted",
        eventData: { columnId: column.id },
      });
      if (input.cycleId !== undefined && input.cycleId !== ext.cycleId)
        await tx.insert(activityTable).values({
          taskId,
          userId: actor.userId,
          type: "cycle_changed",
          eventData: { oldCycleId: ext.cycleId, cycleId: input.cycleId },
        });
      return { after, source: ext.triageSource };
    },
  );
  if (result.source === "member" || result.source === "intake")
    await publishEvent("task.created", {
      ...result.after,
      taskId,
      userId: result.after.userId ?? "",
      currentUserId: actor.userId,
      type: "created",
      content: null,
    });
  await publishTaskMutation(before, result.after, actor.userId);
  await publishEvent("parity.workspace_updated", {
    type: "TRIAGE_UPDATED",
    workspaceId: actor.workspaceId,
    projectId: before.projectId,
  });
  return { id: taskId };
}

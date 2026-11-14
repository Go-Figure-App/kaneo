import { sendNotificationEmail } from "@tracing/email";
import { and, asc, eq, or } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import {
  activityTable,
  columnTable,
  taskRelationTable,
  taskTable,
} from "../../../database/schema";
import { columnExtTable, taskExtTable } from "../../../database/schema-parity";
import { publishEvent } from "../../../events";
import {
  persistNotification,
  dispatchNotification,
} from "../../../notification/controllers/create-notification";
import { nextTaskPosition } from "../../../task/controllers/next-task-position";
import { publishTaskMutation } from "../../../task/controllers/task-mutation-effects";
import { safeOutboundError } from "../../../utils/outbound-request";
import { defaultCategory } from "../../foundation/categories";
import { withPendingTask, type TriageActor } from "./with-pending-task";

type Decision = { comment: string } | { duplicateOfTaskId: string };

export async function closeTriage(
  taskId: string,
  actor: TriageActor,
  decision: Decision,
) {
  const duplicateId =
    "duplicateOfTaskId" in decision ? decision.duplicateOfTaskId : undefined;
  if (duplicateId === taskId)
    throw new HTTPException(400, { message: "A task cannot duplicate itself" });
  const { before, result } = await withPendingTask(
    taskId,
    actor,
    async (tx, task) => {
      const columns = await tx
        .select({ column: columnTable, category: columnExtTable.category })
        .from(columnTable)
        .leftJoin(columnExtTable, eq(columnExtTable.columnId, columnTable.id))
        .where(eq(columnTable.projectId, task.projectId))
        .orderBy(asc(columnTable.position));
      const column = columns.find(
        ({ column, category }) =>
          (category ?? defaultCategory(column.slug, column.isFinal)) ===
          "canceled",
      )?.column;
      if (!column)
        throw new HTTPException(409, {
          message:
            "Configure a canceled category column before declining triage",
        });
      if (duplicateId) {
        const [target] = await tx
          .select()
          .from(taskExtTable)
          .where(eq(taskExtTable.taskId, duplicateId));
        if (
          target?.triageState === "pending" ||
          target?.triageState === "duplicate" ||
          target?.triageState === "declined" ||
          target?.duplicateOfTaskId
        )
          throw new HTTPException(400, {
            message: "Choose an accepted task that is not a duplicate",
          });
        const [existing] = await tx
          .select()
          .from(taskRelationTable)
          .where(
            and(
              eq(taskRelationTable.relationType, "duplicate"),
              or(
                and(
                  eq(taskRelationTable.sourceTaskId, taskId),
                  eq(taskRelationTable.targetTaskId, duplicateId),
                ),
                and(
                  eq(taskRelationTable.sourceTaskId, duplicateId),
                  eq(taskRelationTable.targetTaskId, taskId),
                ),
              ),
            ),
          );
        if (!existing)
          await tx.insert(taskRelationTable).values({
            sourceTaskId: taskId,
            targetTaskId: duplicateId,
            relationType: "duplicate",
          });
      } else if ("comment" in decision) {
        await tx.insert(activityTable).values({
          taskId,
          userId: actor.userId,
          type: "comment",
          content: decision.comment,
        });
      }
      const [after] = await tx
        .update(taskTable)
        .set({
          status: column.slug,
          columnId: column.id,
          // Canceled intake must not generate a new board task through Tracing's
          // final-column recurrence subscriber. Keep the old rule in activity.
          recurrence: null,
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
          triageState: duplicateId ? "duplicate" : "declined",
          duplicateOfTaskId: duplicateId ?? null,
          triagedBy: actor.userId,
          triagedAt: new Date(),
          snoozedUntil: null,
        })
        .where(eq(taskExtTable.taskId, taskId));
      await tx.insert(activityTable).values({
        taskId,
        userId: actor.userId,
        type: duplicateId ? "marked_duplicate" : "triage_declined",
        eventData: {
          ...(duplicateId ? { duplicateOfTaskId: duplicateId } : {}),
          ...(task.recurrence ? { stoppedRecurrence: task.recurrence } : {}),
        },
      });
      const [reporter] = duplicateId
        ? await tx
            .select()
            .from(activityTable)
            .where(
              and(
                eq(activityTable.taskId, taskId),
                eq(activityTable.type, "triage_created"),
              ),
            )
            .orderBy(asc(activityTable.createdAt))
            .limit(1)
        : [];
      const notification = reporter?.userId
        ? await persistNotification(
            {
              userId: reporter.userId,
              type: "marked_duplicate",
              title: "Submission marked as duplicate",
              content:
                "Your submission is being tracked with an existing task.",
              resourceType: "task",
              resourceId: taskId,
              eventData: {
                workspaceId: actor.workspaceId,
                projectId: task.projectId,
              },
            },
            tx,
          )
        : null;
      const data = reporter?.eventData;
      const email =
        data && typeof data === "object" && "reporterEmail" in data
          ? data.reporterEmail
          : null;
      return {
        after,
        notification,
        email: typeof email === "string" ? email : null,
      };
    },
    duplicateId,
  );
  await publishTaskMutation(before, result.after, actor.userId);
  if (duplicateId)
    await publishEvent("task-relation.refresh", {
      projectId: before.projectId,
      userId: actor.userId,
    });
  await publishEvent("parity.workspace_updated", {
    type: "TRIAGE_UPDATED",
    workspaceId: actor.workspaceId,
    projectId: before.projectId,
  });
  if (result.notification) await dispatchNotification(result.notification);
  if (result.email) {
    // An intake address grants no project access. Send only a generic receipt,
    // never the original task's title, identifier, URL or private content.
    void sendNotificationEmail(result.email, "Submission marked as duplicate", {
      title: "Submission marked as duplicate",
      message: "Your submission is being tracked with an existing task.",
    }).catch((error) =>
      console.error("Triage receipt delivery failed", {
        error: safeOutboundError(error),
      }),
    );
  }
  return { id: taskId };
}

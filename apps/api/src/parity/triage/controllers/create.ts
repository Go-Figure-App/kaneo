import { and, eq, isNull } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import db from "../../../database";
import {
  activityTable,
  projectTable,
  taskTable,
} from "../../../database/schema";
import { projectExtTable, taskExtTable } from "../../../database/schema-parity";
import {
  persistNotification,
  dispatchNotification,
} from "../../../notification/controllers/create-notification";
import { publishEvent } from "../../../events";
import { claimTaskNumber } from "../../../task/controllers/claim-task-numbers";
import { nextTaskPosition } from "../../../task/controllers/next-task-position";
import type { CreateTriageInput } from "../schema";
import { assertAssignableUser } from "../../../utils/assert-assignable-user";
import { workspaceIsActive } from "../../../workspace/archive/active-workspace-sql";
import { saveMemberFields } from "./member-fields";
import { requireWorkspaceEntitlement } from "../../../billing/controllers/require-entitlement";
import { projectAccessCondition } from "../../../project-access/project-access-condition";

export async function createTriageItem(
  projectId: string,
  input: CreateTriageInput,
  reporter:
    | { userId: string; workspaceId: string }
    | { email: string; token: string },
) {
  const result = await db.transaction(async (tx) => {
    const [project] = await tx
      .select()
      .from(projectTable)
      .where(
        and(
          eq(projectTable.id, projectId),
          isNull(projectTable.archivedAt),
          workspaceIsActive(projectTable.workspaceId),
          "userId" in reporter
            ? projectAccessCondition(reporter.userId, projectTable.id)
            : undefined,
          "workspaceId" in reporter
            ? eq(projectTable.workspaceId, reporter.workspaceId)
            : undefined,
        ),
      )
      .for("update");
    const [settings] = await tx
      .select()
      .from(projectExtTable)
      .where(eq(projectExtTable.projectId, projectId));
    // Recheck the token under the project lock shared with settings updates.
    if (
      !project ||
      !settings?.triageEnabled ||
      ("token" in reporter && reporter.token !== settings.intakeToken)
    )
      throw new HTTPException(404, { message: "Triage intake is unavailable" });
    await requireWorkspaceEntitlement(project.workspaceId, tx);
    if (
      input.startDate &&
      input.dueDate &&
      new Date(input.startDate) > new Date(input.dueDate)
    )
      throw new HTTPException(400, {
        message: "Due date cannot precede start date",
      });
    if ("userId" in reporter && input.userId)
      await assertAssignableUser(
        input.userId,
        project.workspaceId,
        projectId,
        tx,
      );
    const [task] = await tx
      .insert(taskTable)
      .values({
        projectId,
        title: input.title,
        description: input.description,
        status: "triage",
        columnId: null,
        priority:
          "userId" in reporter
            ? (input.priority ?? "no-priority")
            : "no-priority",
        userId: "userId" in reporter ? (input.userId ?? null) : null,
        startDate:
          "userId" in reporter && input.startDate
            ? new Date(input.startDate)
            : null,
        dueDate:
          "userId" in reporter && input.dueDate
            ? new Date(input.dueDate)
            : null,
        recurrence: "userId" in reporter ? (input.recurrence ?? null) : null,
        number: await claimTaskNumber(projectId, tx),
        position: await nextTaskPosition(tx, projectId, "triage", null),
      })
      .returning();
    if (!task)
      throw new HTTPException(500, { message: "Failed to create triage item" });
    const source = "userId" in reporter ? "member" : "intake";
    await tx.insert(taskExtTable).values({
      taskId: task.id,
      triageState: "pending",
      triageSource: source,
    });
    if ("userId" in reporter)
      await saveMemberFields(
        tx,
        task,
        reporter.userId,
        project.workspaceId,
        input,
      );
    await tx.insert(activityTable).values({
      taskId: task.id,
      type: "triage_created",
      userId: "userId" in reporter ? reporter.userId : null,
      eventData: {
        source,
        ...("email" in reporter ? { reporterEmail: reporter.email } : {}),
      },
    });
    const notification = settings.triageOwnerId
      ? await persistNotification(
          {
            userId: settings.triageOwnerId,
            type: "triage_created",
            title: "New triage item",
            content: task.title,
            resourceId: task.id,
            resourceType: "task",
            eventData: {
              workspaceId: project.workspaceId,
              projectId,
              taskTitle: task.title,
            },
          },
          tx,
        )
      : null;
    return { task, notification, workspaceId: project.workspaceId };
  });
  if (result.notification) await dispatchNotification(result.notification);
  // task.created starts outbound integrations; pending submissions must not be exported.
  await publishEvent("parity.workspace_updated", {
    type: "TRIAGE_UPDATED",
    workspaceId: result.workspaceId,
    projectId,
  });
  return result.task;
}

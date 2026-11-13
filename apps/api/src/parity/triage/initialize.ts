import { and, eq } from "drizzle-orm";
import db from "../../database";
import { activityTable, projectTable, taskTable } from "../../database/schema";
import { projectExtTable, taskExtTable } from "../../database/schema-parity";
import { publishEvent, subscribeToEvent } from "../../events";
import createNotification from "../../notification/controllers/create-notification";
import { enabledFeatures } from "../foundation/features";

let initialized = false;
export async function initializeTriage() {
  if (initialized || !enabledFeatures().includes("triage")) return;
  await subscribeToEvent<{ taskId: string; source: string }>(
    "parity.triage_created",
    async ({ taskId, source }) => {
      if (!enabledFeatures().includes("triage")) return;
      const [item] = await db
        .select({
          projectId: taskTable.projectId,
          title: taskTable.title,
          workspaceId: projectTable.workspaceId,
          ownerId: projectExtTable.triageOwnerId,
        })
        .from(taskTable)
        .innerJoin(taskExtTable, eq(taskExtTable.taskId, taskTable.id))
        .innerJoin(projectTable, eq(projectTable.id, taskTable.projectId))
        .innerJoin(
          projectExtTable,
          eq(projectExtTable.projectId, projectTable.id),
        )
        .where(
          and(
            eq(taskTable.id, taskId),
            eq(taskExtTable.triageState, "pending"),
          ),
        );
      if (!item) return;
      await db
        .insert(activityTable)
        .values({ taskId, type: "triage_created", eventData: { source } });
      if (item.ownerId)
        await createNotification({
          userId: item.ownerId,
          type: "triage_created",
          title: "New triage item",
          content: item.title,
          resourceType: "task",
          resourceId: taskId,
          eventData: {
            workspaceId: item.workspaceId,
            projectId: item.projectId,
          },
        });
      await publishEvent("parity.workspace_updated", {
        type: "TRIAGE_UPDATED",
        workspaceId: item.workspaceId,
        projectId: item.projectId,
      });
    },
  );
  initialized = true;
}

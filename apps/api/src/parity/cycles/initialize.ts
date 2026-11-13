import { and, eq, inArray, isNotNull, sql } from "drizzle-orm";
import db from "../../database";
import { projectTable, taskTable } from "../../database/schema";
import { cycleTable, taskExtTable } from "../../database/schema-parity";
import { publishEvent, subscribeToEvent } from "../../events";
import { enabledFeatures } from "../foundation/features";

export async function reconcileCycleReferences(
  projectId: string,
  taskId?: string,
) {
  return db.transaction(async (tx) => {
    const [project] = await tx
      .select({ workspaceId: projectTable.workspaceId })
      .from(projectTable)
      .where(eq(projectTable.id, projectId))
      .for("update");
    if (!project) return;
    const stale = await tx
      .select({ taskId: taskTable.id, workspaceId: cycleTable.workspaceId })
      .from(taskTable)
      .innerJoin(taskExtTable, eq(taskExtTable.taskId, taskTable.id))
      .leftJoin(cycleTable, eq(cycleTable.id, taskExtTable.cycleId))
      .where(
        and(
          eq(taskTable.projectId, projectId),
          taskId ? eq(taskTable.id, taskId) : undefined,
          isNotNull(taskExtTable.cycleId),
          sql`${cycleTable.workspaceId} IS DISTINCT FROM ${project.workspaceId}`,
        ),
      )
      .orderBy(taskTable.id)
      .for("update", { of: taskTable });
    for (let offset = 0; offset < stale.length; offset += 200)
      await tx
        .update(taskExtTable)
        .set({ cycleId: null })
        .where(
          inArray(
            taskExtTable.taskId,
            stale.slice(offset, offset + 200).map((task) => task.taskId),
          ),
        );
    return {
      workspaceId: project.workspaceId,
      formerWorkspaceIds: [
        ...new Set(
          stale.flatMap((task) => (task.workspaceId ? [task.workspaceId] : [])),
        ),
      ],
    };
  });
}

async function announceProject(projectId: string, taskId?: string) {
  const scope = await reconcileCycleReferences(projectId, taskId);
  if (!scope) return;
  await publishEvent("parity.workspace_updated", {
    type: "CYCLE_UPDATED",
    workspaceId: scope.workspaceId,
    projectId,
  });
  for (const workspaceId of scope.formerWorkspaceIds)
    await publishEvent("parity.workspace_updated", {
      type: "CYCLE_UPDATED",
      workspaceId,
    });
}

let initialized = false;
export async function initializeCycles() {
  if (initialized || !enabledFeatures().includes("cycles")) return;
  await subscribeToEvent<{ projectId: string }>(
    "project.updated",
    async ({ projectId }) => {
      if (enabledFeatures().includes("cycles"))
        await announceProject(projectId);
    },
  );
  for (const event of [
    "task.created",
    "task.updated",
    "task.status_changed",
    "task.moved",
    "task.deleted",
  ])
    await subscribeToEvent<{
      taskId: string;
      projectId?: string;
      fromProjectId?: string;
      toProjectId?: string;
    }>(event, async (data) => {
      if (!enabledFeatures().includes("cycles")) return;
      const [task] = await db
        .select({ projectId: taskTable.projectId })
        .from(taskTable)
        .where(eq(taskTable.id, data.taskId));
      const projectIds = new Set(
        [
          task?.projectId,
          data.projectId,
          data.fromProjectId,
          data.toProjectId,
        ].filter((id): id is string => Boolean(id)),
      );
      for (const projectId of projectIds)
        await announceProject(projectId, data.taskId);
    });
  initialized = true;
}

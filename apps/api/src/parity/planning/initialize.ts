import { and, eq, inArray, ne } from "drizzle-orm";
import db from "../../database";
import { projectTable, taskTable } from "../../database/schema";
import {
  initiativeProjectTable,
  initiativeTable,
  projectExtTable,
  projectMilestoneTable,
  taskExtTable,
} from "../../database/schema-parity";
import { publishEvent, subscribeToEvent } from "../../events";
import { filterAssignableUsers } from "../../utils/assert-assignable-user";
import { enabledFeatures } from "../foundation/features";

const enabled = () =>
  enabledFeatures().some(
    (feature) => feature === "projects" || feature === "initiatives",
  );

export async function reconcilePlanningProject(projectId: string) {
  const workspaces = await db.transaction(async (tx) => {
    const [project] = await tx
      .select()
      .from(projectTable)
      .where(eq(projectTable.id, projectId))
      .for("update");
    if (!project) return [];
    const stale = await tx
      .select({
        id: initiativeTable.id,
        workspaceId: initiativeTable.workspaceId,
      })
      .from(initiativeProjectTable)
      .innerJoin(
        initiativeTable,
        eq(initiativeTable.id, initiativeProjectTable.initiativeId),
      )
      .where(
        and(
          eq(initiativeProjectTable.projectId, projectId),
          ne(initiativeTable.workspaceId, project.workspaceId),
        ),
      );
    if (stale.length)
      await tx.delete(initiativeProjectTable).where(
        and(
          eq(initiativeProjectTable.projectId, projectId),
          inArray(
            initiativeProjectTable.initiativeId,
            stale.map((row) => row.id),
          ),
        ),
      );
    const [plan] = await tx
      .select({ leadId: projectExtTable.leadId })
      .from(projectExtTable)
      .where(eq(projectExtTable.projectId, projectId));
    if (
      plan?.leadId &&
      !(
        await filterAssignableUsers([plan.leadId], project.workspaceId, tx)
      ).has(plan.leadId)
    )
      await tx
        .update(projectExtTable)
        .set({ leadId: null })
        .where(eq(projectExtTable.projectId, projectId));
    return [
      ...new Set([project.workspaceId, ...stale.map((row) => row.workspaceId)]),
    ];
  });
  for (const workspaceId of workspaces)
    await publishEvent("parity.workspace_updated", {
      type: "PROJECT_PLAN_UPDATED",
      workspaceId,
    });
}

export async function reconcileTaskMilestone(taskId: string) {
  return db.transaction(async (tx) => {
    const [found] = await tx
      .select({ projectId: taskTable.projectId })
      .from(taskTable)
      .where(eq(taskTable.id, taskId));
    if (!found) return;
    await tx
      .select({ id: projectTable.id })
      .from(projectTable)
      .where(eq(projectTable.id, found.projectId))
      .for("update");
    const [task] = await tx
      .select({ id: taskTable.id })
      .from(taskTable)
      .where(
        and(eq(taskTable.id, taskId), eq(taskTable.projectId, found.projectId)),
      )
      .for("update");
    if (!task) return;
    const [ext] = await tx
      .select({ milestoneId: taskExtTable.milestoneId })
      .from(taskExtTable)
      .where(eq(taskExtTable.taskId, taskId));
    if (ext?.milestoneId) {
      const [milestone] = await tx
        .select({ id: projectMilestoneTable.id })
        .from(projectMilestoneTable)
        .where(
          and(
            eq(projectMilestoneTable.id, ext.milestoneId),
            eq(projectMilestoneTable.projectId, found.projectId),
          ),
        );
      if (!milestone)
        await tx
          .update(taskExtTable)
          .set({ milestoneId: null })
          .where(eq(taskExtTable.taskId, taskId));
    }
    return found.projectId;
  });
}

let initialized = false;
export async function initializePlanning() {
  if (initialized || !enabled()) return;
  await subscribeToEvent<{ projectId: string }>(
    "project.updated",
    async ({ projectId }) => {
      if (enabled()) await reconcilePlanningProject(projectId);
    },
  );
  for (const event of [
    "task.created",
    "task.updated",
    "task.status_changed",
    "task.moved",
    "task.deleted",
  ]) {
    await subscribeToEvent<{
      taskId: string;
      projectId?: string;
      fromProjectId?: string;
      toProjectId?: string;
    }>(event, async (data) => {
      if (!enabled()) return;
      const current = await reconcileTaskMilestone(data.taskId);
      const ids = [
        ...new Set(
          [
            current,
            data.projectId,
            data.fromProjectId,
            data.toProjectId,
          ].filter((id): id is string => Boolean(id)),
        ),
      ];
      if (!ids.length) return;
      const projects = await db
        .select({
          projectId: projectTable.id,
          workspaceId: projectTable.workspaceId,
        })
        .from(projectTable)
        .where(inArray(projectTable.id, ids));
      for (const project of projects)
        await publishEvent("parity.workspace_updated", {
          type: "PROJECT_PLAN_UPDATED",
          ...project,
        });
    });
  }
  initialized = true;
}

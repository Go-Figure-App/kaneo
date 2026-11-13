import { and, eq, sql } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import db from "../../database";
import { activityTable, projectTable, taskTable } from "../../database/schema";
import {
  projectMilestoneTable,
  taskExtTable,
} from "../../database/schema-parity";
import { publishEvent } from "../../events";
import { lockProject, readableProjects, type Actor } from "./access";
import { listMilestones } from "./project-read";
import type { MilestoneInput, MilestonePatch } from "./schema";

async function announce(projectId: string, who: Actor) {
  await publishEvent("parity.workspace_updated", {
    type: "PROJECT_PLAN_UPDATED",
    workspaceId: who.workspaceId,
    projectId,
  });
}

export async function createMilestone(
  projectId: string,
  who: Actor,
  input: MilestoneInput,
) {
  const id = await db.transaction(async (tx) => {
    await lockProject(tx, projectId, who);
    const [last] = await tx
      .select({
        value: sql<number>`coalesce(max(${projectMilestoneTable.position}), -1)::int`,
      })
      .from(projectMilestoneTable)
      .where(eq(projectMilestoneTable.projectId, projectId));
    const [created] = await tx
      .insert(projectMilestoneTable)
      .values({
        ...input,
        projectId,
        position: input.position ?? (last?.value ?? -1) + 1,
      })
      .returning({ id: projectMilestoneTable.id });
    if (!created)
      throw new HTTPException(500, { message: "Could not create milestone" });
    return created.id;
  });
  await announce(projectId, who);
  const milestone = (await listMilestones(projectId, who)).find(
    (item) => item.id === id,
  );
  if (!milestone)
    throw new HTTPException(404, { message: "Milestone not found" });
  return milestone;
}

export async function changeMilestone(
  id: string,
  who: Actor,
  input: MilestonePatch | null,
) {
  const projectId = await db.transaction(async (tx) => {
    const [found] = await tx
      .select({ projectId: projectMilestoneTable.projectId })
      .from(projectMilestoneTable)
      .where(eq(projectMilestoneTable.id, id));
    if (!found)
      throw new HTTPException(404, { message: "Milestone not found" });
    await lockProject(tx, found.projectId, who);
    const [milestone] = await tx
      .select()
      .from(projectMilestoneTable)
      .where(
        and(
          eq(projectMilestoneTable.id, id),
          eq(projectMilestoneTable.projectId, found.projectId),
        ),
      )
      .for("update");
    if (!milestone)
      throw new HTTPException(404, { message: "Milestone not found" });
    if (input) {
      if (Object.values(input).some((value) => value !== undefined))
        await tx
          .update(projectMilestoneTable)
          .set(input)
          .where(eq(projectMilestoneTable.id, id));
    } else {
      // The reserved side-table field has no FK; clear references atomically.
      await tx
        .select({ id: taskTable.id })
        .from(taskTable)
        .where(eq(taskTable.projectId, found.projectId))
        .orderBy(taskTable.id)
        .for("update");
      await tx
        .update(taskExtTable)
        .set({ milestoneId: null })
        .where(eq(taskExtTable.milestoneId, id));
      await tx
        .delete(projectMilestoneTable)
        .where(eq(projectMilestoneTable.id, id));
    }
    return found.projectId;
  });
  await announce(projectId, who);
  if (!input) return null;
  const milestone = (await listMilestones(projectId, who)).find(
    (item) => item.id === id,
  );
  if (!milestone)
    throw new HTTPException(404, { message: "Milestone not found" });
  return milestone;
}

export async function getTaskMilestone(taskId: string, who: Actor) {
  const [row] = await db
    .select({
      taskId: taskTable.id,
      milestoneId: projectMilestoneTable.id,
      name: projectMilestoneTable.name,
    })
    .from(taskTable)
    .innerJoin(projectTable, eq(projectTable.id, taskTable.projectId))
    .leftJoin(taskExtTable, eq(taskExtTable.taskId, taskTable.id))
    .leftJoin(
      projectMilestoneTable,
      and(
        eq(projectMilestoneTable.id, taskExtTable.milestoneId),
        eq(projectMilestoneTable.projectId, taskTable.projectId),
      ),
    )
    .where(and(eq(taskTable.id, taskId), readableProjects(who)));
  if (!row) throw new HTTPException(404, { message: "Task not found" });
  return row;
}

export async function setTaskMilestone(
  taskId: string,
  who: Actor,
  milestoneId: string | null,
) {
  const projectId = await db.transaction(async (tx) => {
    const [found] = await tx
      .select({ projectId: taskTable.projectId })
      .from(taskTable)
      .where(eq(taskTable.id, taskId));
    if (!found) throw new HTTPException(404, { message: "Task not found" });
    await lockProject(tx, found.projectId, who);
    const [task] = await tx
      .select()
      .from(taskTable)
      .where(
        and(eq(taskTable.id, taskId), eq(taskTable.projectId, found.projectId)),
      )
      .for("update");
    if (!task)
      throw new HTTPException(409, {
        message: "Task moved; refresh and try again",
      });
    if (milestoneId) {
      const [milestone] = await tx
        .select({ id: projectMilestoneTable.id })
        .from(projectMilestoneTable)
        .where(
          and(
            eq(projectMilestoneTable.id, milestoneId),
            eq(projectMilestoneTable.projectId, task.projectId),
          ),
        );
      if (!milestone)
        throw new HTTPException(400, {
          message: "Milestone must belong to this project",
        });
    }
    const [before] = await tx
      .select({ milestoneId: taskExtTable.milestoneId })
      .from(taskExtTable)
      .where(eq(taskExtTable.taskId, taskId));
    if ((before?.milestoneId ?? null) !== milestoneId) {
      await tx
        .insert(taskExtTable)
        .values({ taskId, milestoneId })
        .onConflictDoUpdate({
          target: taskExtTable.taskId,
          set: { milestoneId },
        });
      await tx.insert(activityTable).values({
        taskId,
        userId: who.userId,
        type: "milestone_changed",
        eventData: {
          oldMilestoneId: before?.milestoneId ?? null,
          milestoneId,
        },
      });
    }
    return task.projectId;
  });
  await announce(projectId, who);
  await publishEvent("task.updated", { taskId, projectId });
  return getTaskMilestone(taskId, who);
}

import { and, eq, inArray } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import db from "../../database";
import { activityTable, projectTable, taskTable } from "../../database/schema";
import {
  cycleTable,
  projectMilestoneTable,
  taskExtTable,
} from "../../database/schema-parity";
import { publishEvent } from "../../events";
import { enabledFeatures } from "../foundation/features";
import {
  readableProjects,
  type Actor,
  type Transaction,
} from "../planning/access";
import { acceptedTaskCondition } from "../triage/visibility";
import { lockCycleWorkspace } from "./access";
import { validEstimate } from "./estimates";
import { cycleSettings } from "./settings-read";
import type { CycleTaskMutation } from "./task-schema";

export async function validateCycleAssignment(
  tx: Transaction,
  workspaceId: string,
  cycleId: string | null,
) {
  if (!cycleId) return;
  if (
    !enabledFeatures().includes("cycles") ||
    !(await cycleSettings(workspaceId, tx)).cyclesEnabled
  )
    throw new HTTPException(400, {
      message: "Enable cycles in workspace settings first",
    });
  const [cycle] = await tx
    .select({ id: cycleTable.id })
    .from(cycleTable)
    .where(
      and(eq(cycleTable.id, cycleId), eq(cycleTable.workspaceId, workspaceId)),
    );
  if (!cycle)
    throw new HTTPException(400, {
      message: "Cycle must belong to this workspace",
    });
}

async function lockTasks(tx: Transaction, taskIds: string[], who: Actor) {
  const found = await tx
    .select({ id: taskTable.id, projectId: taskTable.projectId })
    .from(taskTable)
    .innerJoin(projectTable, eq(projectTable.id, taskTable.projectId))
    .where(
      and(
        inArray(taskTable.id, taskIds),
        readableProjects(who),
        acceptedTaskCondition(taskTable.id),
      ),
    );
  if (found.length !== taskIds.length)
    throw new HTTPException(404, { message: "Task not found" });
  const projects = await tx
    .select({ id: projectTable.id })
    .from(projectTable)
    .where(
      and(
        inArray(projectTable.id, [
          ...new Set(found.map((task) => task.projectId)),
        ]),
        readableProjects(who),
      ),
    )
    .orderBy(projectTable.id)
    .for("update");
  const allowed = new Set(projects.map((project) => project.id));
  const tasks = await tx
    .select()
    .from(taskTable)
    .where(inArray(taskTable.id, taskIds))
    .orderBy(taskTable.id)
    .for("update");
  const originalProjects = new Map(
    found.map((task) => [task.id, task.projectId]),
  );
  if (
    tasks.length !== taskIds.length ||
    tasks.some(
      (task) =>
        !allowed.has(task.projectId) ||
        originalProjects.get(task.id) !== task.projectId,
    )
  )
    throw new HTTPException(409, {
      message: "Tasks moved; refresh and try again",
    });
  return tasks;
}

export async function mutateCycleTasks(who: Actor, input: CycleTaskMutation) {
  const feature = input.operation === "updateMilestone" ? "projects" : "cycles";
  if (!enabledFeatures().includes(feature))
    throw new HTTPException(404, { message: "Feature not enabled" });
  const taskIds = [...new Set(input.taskIds)].sort();
  const changed = await db.transaction(async (tx) => {
    await lockCycleWorkspace(tx, who.workspaceId);
    const tasks = await lockTasks(tx, taskIds, who);
    const settings = await cycleSettings(who.workspaceId, tx);
    if (
      input.operation === "updateEstimate" &&
      !validEstimate(input.value, settings.estimateScale)
    )
      throw new HTTPException(400, {
        message: "Estimate must be a value on the workspace scale",
      });
    if (input.operation === "updateCycle")
      await validateCycleAssignment(tx, who.workspaceId, input.value);
    if (input.operation === "updateMilestone" && input.value) {
      const [milestone] = await tx
        .select({ projectId: projectMilestoneTable.projectId })
        .from(projectMilestoneTable)
        .where(eq(projectMilestoneTable.id, input.value));
      if (
        !milestone ||
        tasks.some((task) => task.projectId !== milestone.projectId)
      )
        throw new HTTPException(400, {
          message: "Milestone must belong to every task's project",
        });
    }
    const extensions = await tx
      .select()
      .from(taskExtTable)
      .where(inArray(taskExtTable.taskId, taskIds));
    const previous = new Map(extensions.map((ext) => [ext.taskId, ext]));
    const changed: { taskId: string; projectId: string }[] = [];
    for (const task of tasks) {
      const before = previous.get(task.id);
      if (before?.triageState === "pending")
        throw new HTTPException(409, {
          message: "Accept this task from triage first",
        });
      const field =
        input.operation === "updateCycle"
          ? "cycleId"
          : input.operation === "updateEstimate"
            ? "estimate"
            : "milestoneId";
      if ((before?.[field] ?? null) === input.value) continue;
      const value =
        input.operation === "updateCycle"
          ? { cycleId: input.value }
          : input.operation === "updateEstimate"
            ? { estimate: input.value }
            : { milestoneId: input.value };
      await tx
        .insert(taskExtTable)
        .values({ taskId: task.id, ...value })
        .onConflictDoUpdate({ target: taskExtTable.taskId, set: value });
      const type =
        input.operation === "updateCycle"
          ? "cycle_changed"
          : input.operation === "updateEstimate"
            ? "estimate_changed"
            : "milestone_changed";
      const oldField =
        input.operation === "updateCycle"
          ? "oldCycleId"
          : input.operation === "updateEstimate"
            ? "oldEstimate"
            : "oldMilestoneId";
      await tx.insert(activityTable).values({
        taskId: task.id,
        userId: who.userId,
        type,
        eventData: { [oldField]: before?.[field] ?? null, ...value },
      });
      changed.push({ taskId: task.id, projectId: task.projectId });
    }
    return changed;
  });
  for (const task of changed)
    await publishEvent("task.updated", task, { waitForHandlers: true });
  for (const projectId of new Set(changed.map((task) => task.projectId)))
    await publishEvent(
      "parity.workspace_updated",
      {
        type: feature === "projects" ? "PROJECT_PLAN_UPDATED" : "CYCLE_UPDATED",
        workspaceId: who.workspaceId,
        projectId,
      },
      { waitForHandlers: true },
    );
  return {
    taskIds: changed.map((task) => task.taskId),
    updated: changed.length,
  };
}

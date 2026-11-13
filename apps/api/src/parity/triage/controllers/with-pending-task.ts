import { and, eq, inArray, isNull } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import db from "../../../database";
import { projectTable, taskTable } from "../../../database/schema";
import { taskExtTable } from "../../../database/schema-parity";
import { projectAccessCondition } from "../../../project-access/project-access-condition";
import { workspaceIsActive } from "../../../workspace/archive/active-workspace-sql";

export type TriageActor = { userId: string; workspaceId: string };
export type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

export async function withPendingTask<T>(
  taskId: string,
  actor: TriageActor,
  mutate: (
    tx: Transaction,
    task: typeof taskTable.$inferSelect,
    ext: typeof taskExtTable.$inferSelect,
  ) => Promise<T>,
  targetTaskId?: string,
) {
  return db.transaction(async (tx) => {
    const ids = targetTaskId ? [taskId, targetTaskId] : [taskId];
    // Match moves' project-before-task lock order. Duplicate requests lock both
    // tasks in a stable order, so two reviewers cannot create reciprocal links.
    await tx
      .select({ id: projectTable.id })
      .from(projectTable)
      .where(
        inArray(
          projectTable.id,
          tx
            .select({ id: taskTable.projectId })
            .from(taskTable)
            .where(inArray(taskTable.id, ids)),
        ),
      )
      .orderBy(projectTable.id)
      .for("update");
    const tasks = await tx
      .select()
      .from(taskTable)
      .where(inArray(taskTable.id, ids))
      .orderBy(taskTable.id)
      .for("update");
    const task = tasks.find((item) => item.id === taskId);
    if (!task) throw new HTTPException(404, { message: "Task not found" });
    for (const item of tasks) {
      const [project] = await tx
        .select({ id: projectTable.id })
        .from(projectTable)
        .where(
          and(
            eq(projectTable.id, item.projectId),
            eq(projectTable.workspaceId, actor.workspaceId),
            isNull(projectTable.archivedAt),
            workspaceIsActive(projectTable.workspaceId),
            projectAccessCondition(actor.userId, projectTable.id),
          ),
        );
      if (!project) throw new HTTPException(404, { message: "Task not found" });
    }
    if (targetTaskId && !tasks.some((item) => item.id === targetTaskId))
      throw new HTTPException(404, { message: "Target task not found" });
    const [ext] = await tx
      .select()
      .from(taskExtTable)
      .where(eq(taskExtTable.taskId, taskId));
    if (ext?.triageState !== "pending")
      throw new HTTPException(409, {
        message: "This item is no longer pending triage",
      });
    return { before: task, result: await mutate(tx, task, ext) };
  });
}

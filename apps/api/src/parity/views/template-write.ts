import { and, eq, inArray, isNull, sql } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import db from "../../database";
import { labelTable } from "../../database/schema";
import { taskTemplateTable } from "../../database/schema-parity";
import { assertAssignableUser } from "../../utils/assert-assignable-user";
import { lockCycleWorkspace } from "../cycles/access";
import { validEstimate } from "../cycles/estimates";
import { cycleSettings } from "../cycles/settings-read";
import { lockProject, type Actor } from "../planning/access";
import { announceViews } from "./saved-views";
import type { TemplateInput } from "./schema";

export async function saveTaskTemplate(
  projectId: string,
  who: Actor,
  input: TemplateInput,
  previousName?: string,
) {
  const result = await db.transaction(async (tx) => {
    await lockCycleWorkspace(tx, who.workspaceId);
    await lockProject(tx, projectId, who);
    if (input.defaults.assigneeId)
      await assertAssignableUser(
        input.defaults.assigneeId,
        who.workspaceId,
        projectId,
        tx,
      );
    const settings = await cycleSettings(who.workspaceId, tx);
    if (!validEstimate(input.defaults.estimate, settings.estimateScale))
      throw new HTTPException(400, {
        message: "Estimate is not available on the workspace scale",
      });
    if (input.defaults.labels.length) {
      const labels = await tx
        .selectDistinct({ name: labelTable.name })
        .from(labelTable)
        .where(
          and(
            eq(labelTable.workspaceId, who.workspaceId),
            isNull(labelTable.taskId),
            isNull(labelTable.deletionStartedAt),
            inArray(labelTable.name, input.defaults.labels),
          ),
        );
      if (new Set(input.defaults.labels).size !== labels.length)
        throw new HTTPException(400, {
          message: "Choose existing workspace labels",
        });
    }
    const [duplicate] = await tx
      .select({ name: taskTemplateTable.name })
      .from(taskTemplateTable)
      .where(
        and(
          eq(taskTemplateTable.projectId, projectId),
          eq(taskTemplateTable.name, input.name),
        ),
      );
    if (duplicate && previousName !== input.name)
      throw new HTTPException(409, {
        message: "A template with this name already exists",
      });
    if (previousName !== undefined) {
      const [row] = await tx
        .update(taskTemplateTable)
        .set(input)
        .where(
          and(
            eq(taskTemplateTable.projectId, projectId),
            eq(taskTemplateTable.name, previousName),
          ),
        )
        .returning();
      if (!row) throw new HTTPException(404, { message: "Template not found" });
      return row;
    }
    const [count] = await tx
      .select({ value: sql<number>`count(*)::int` })
      .from(taskTemplateTable)
      .where(eq(taskTemplateTable.projectId, projectId));
    if ((count?.value ?? 0) >= 200)
      throw new HTTPException(400, {
        message: "Remove an unused template before creating another",
      });
    const [row] = await tx
      .insert(taskTemplateTable)
      .values({ ...input, projectId })
      .returning();
    return row!;
  });
  await announceViews(who);
  return result;
}
export async function deleteTaskTemplate(
  projectId: string,
  name: string,
  who: Actor,
) {
  await db.transaction(async (tx) => {
    await lockCycleWorkspace(tx, who.workspaceId);
    await lockProject(tx, projectId, who);
    const [row] = await tx
      .delete(taskTemplateTable)
      .where(
        and(
          eq(taskTemplateTable.projectId, projectId),
          eq(taskTemplateTable.name, name),
        ),
      )
      .returning();
    if (!row) throw new HTTPException(404, { message: "Template not found" });
  });
  await announceViews(who);
  return { projectId, name };
}

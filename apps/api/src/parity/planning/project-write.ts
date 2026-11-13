import { eq } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import db from "../../database";
import { projectExtTable } from "../../database/schema-parity";
import { publishEvent } from "../../events";
import { assertAssignableUser } from "../../utils/assert-assignable-user";
import { lockProject, type Actor } from "./access";
import { getProjectPlan } from "./project-read";
import type { PlanInput } from "./schema";

export async function updateProjectPlan(
  projectId: string,
  who: Actor,
  input: PlanInput,
) {
  await db.transaction(async (tx) => {
    await lockProject(tx, projectId, who);
    if (input.leadId)
      await assertAssignableUser(input.leadId, who.workspaceId, projectId, tx);
    const [current] = await tx
      .select()
      .from(projectExtTable)
      .where(eq(projectExtTable.projectId, projectId));
    const start =
      input.startDate === undefined ? current?.startDate : input.startDate;
    const target =
      input.targetDate === undefined ? current?.targetDate : input.targetDate;
    if (start && target && start > target)
      throw new HTTPException(400, {
        message: "Target date cannot precede the start date",
      });
    if (Object.values(input).every((value) => value === undefined)) return;
    await tx
      .insert(projectExtTable)
      .values({ projectId, ...input })
      .onConflictDoUpdate({ target: projectExtTable.projectId, set: input });
  });
  await publishEvent("parity.workspace_updated", {
    type: "PROJECT_PLAN_UPDATED",
    workspaceId: who.workspaceId,
    projectId,
  });
  return getProjectPlan(projectId, who);
}

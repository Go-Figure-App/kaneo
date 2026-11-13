import { and, eq } from "drizzle-orm";
import { projectExtTable, taskExtTable } from "../../database/schema-parity";
import { taskTable } from "../../database/schema";
import { enabledFeatures } from "../foundation/features";
import { integrationTriageEnabled } from "./integration-config";
import type { Transaction } from "./controllers/with-pending-task";

/** Called inside the producer's transaction, before its task becomes visible. */
export async function stageIntegrationTriage(
  tx: Transaction,
  task: typeof taskTable.$inferSelect,
  integration: { type: string; config: string },
) {
  if (
    !enabledFeatures().includes("triage") ||
    !integrationTriageEnabled(integration.config)
  )
    return false;
  const [settings] = await tx
    .select()
    .from(projectExtTable)
    .where(
      and(
        eq(projectExtTable.projectId, task.projectId),
        eq(projectExtTable.triageEnabled, true),
      ),
    );
  if (!settings) return false;
  await tx.insert(taskExtTable).values({
    taskId: task.id,
    triageState: "pending",
    triageSource: integration.type,
  });
  await tx
    .update(taskTable)
    .set({ status: "triage", columnId: null })
    .where(eq(taskTable.id, task.id));
  task.status = "triage";
  task.columnId = null;
  return true;
}

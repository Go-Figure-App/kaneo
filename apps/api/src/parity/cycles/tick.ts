import { and, eq, gt, isNull } from "drizzle-orm";
import db from "../../database";
import { workspaceTable } from "../../database/schema";
import { workspaceExtTable } from "../../database/schema-parity";
import { withJobLease } from "../../scheduler/leader-lock";
import { enabledFeatures } from "../foundation/features";
import { lockCycleWorkspace } from "./access";
import { advanceCycles } from "./advance";
import { announceCycleChanges } from "./announce";
import { settingsSchema } from "./schema";
import { cycleSettings } from "./settings-read";

export async function tickWorkspaceCycles(
  workspaceId: string,
  now = new Date(),
) {
  const result = await db.transaction(async (tx) => {
    await lockCycleWorkspace(tx, workspaceId);
    const settings = await cycleSettings(workspaceId, tx);
    settingsSchema.parse(settings);
    return advanceCycles(tx, settings, now);
  });
  if (result.changed)
    await announceCycleChanges(workspaceId, result.rolledOver);
  return result;
}

export async function cycleTick(now = new Date()) {
  const outcome = { processed: 0, degraded: false };
  if (!enabledFeatures().includes("cycles")) return outcome;
  return withJobLease(
    "cycle-tick",
    async () => {
      let after = "";
      for (;;) {
        const rows = await db
          .select({ id: workspaceTable.id })
          .from(workspaceTable)
          .innerJoin(
            workspaceExtTable,
            eq(workspaceExtTable.workspaceId, workspaceTable.id),
          )
          .where(
            and(
              eq(workspaceExtTable.cyclesEnabled, true),
              isNull(workspaceTable.archivedAt),
              gt(workspaceTable.id, after),
            ),
          )
          .orderBy(workspaceTable.id)
          .limit(100);
        for (const row of rows) {
          try {
            const result = await tickWorkspaceCycles(row.id, now);
            outcome.degraded ||= result.catchingUp;
            outcome.processed++;
          } catch (error) {
            outcome.degraded = true;
            console.error("Cycle tick failed for a workspace", error);
          }
        }
        if (rows.length < 100) break;
        after = rows.at(-1)!.id;
      }
      return outcome;
    },
    () => outcome,
  );
}

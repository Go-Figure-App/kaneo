import { eq } from "drizzle-orm";
import db from "../../database";
import { workspaceExtTable } from "../../database/schema-parity";
import type { DbOrTx } from "../../project-access/db-or-tx";
import type { EstimateScale } from "./estimates";

export async function cycleSettings(
  workspaceId: string,
  database: DbOrTx = db,
) {
  const [row] = await database
    .select()
    .from(workspaceExtTable)
    .where(eq(workspaceExtTable.workspaceId, workspaceId));
  return {
    workspaceId,
    estimateScale: (row?.estimateScale ?? "none") as EstimateScale,
    cyclesEnabled: row?.cyclesEnabled ?? false,
    cycleWeeks: row?.cycleWeeks ?? 2,
    cooldownWeeks: row?.cooldownWeeks ?? 0,
    cycleStartDay: (row?.cycleStartDay ?? 1) as 0 | 1 | 2 | 3 | 4 | 5 | 6,
    upcomingCycles: row?.upcomingCycles ?? 2,
    autoRollover: row?.autoRollover ?? true,
    timeZone: row?.timeZone ?? "UTC",
  };
}

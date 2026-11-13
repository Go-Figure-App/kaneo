import { and, eq, isNull, sql } from "drizzle-orm";
import type { Context, Next } from "hono";
import { HTTPException } from "hono/http-exception";
import db from "../../database";
import { workspaceTable } from "../../database/schema";
import { cycleTable } from "../../database/schema-parity";
import { validateWorkspaceAccess } from "../../utils/validate-workspace-access";
import type { DbOrTx } from "../../project-access/db-or-tx";
import { workspaceIsActive } from "../../workspace/archive/active-workspace-sql";
import type { Actor, Transaction } from "../planning/access";

export async function lockCycleWorkspace(tx: Transaction, workspaceId: string) {
  // Match upstream project moves: workspace advisory lock, then project/task rows.
  await tx.execute(
    sql`SELECT pg_advisory_xact_lock(1524, hashtext(${workspaceId}))`,
  );
  const [workspace] = await tx
    .select({ id: workspaceTable.id })
    .from(workspaceTable)
    .where(
      and(
        eq(workspaceTable.id, workspaceId),
        isNull(workspaceTable.archivedAt),
      ),
    )
    .for("share");
  if (!workspace)
    throw new HTTPException(404, { message: "Workspace not found" });
}

export async function findCycle(id: string, who: Actor, database: DbOrTx = db) {
  const [cycle] = await database
    .select()
    .from(cycleTable)
    .where(
      and(
        eq(cycleTable.id, id),
        eq(cycleTable.workspaceId, who.workspaceId),
        workspaceIsActive(cycleTable.workspaceId),
      ),
    );
  if (!cycle) throw new HTTPException(404, { message: "Cycle not found" });
  return cycle;
}

export async function cycleAccess(c: Context, next: Next) {
  const userId = c.get("userId");
  if (!userId) throw new HTTPException(401, { message: "Unauthorized" });
  const [cycle] = await db
    .select({ workspaceId: cycleTable.workspaceId })
    .from(cycleTable)
    .where(eq(cycleTable.id, c.req.param("id") ?? ""));
  if (!cycle) throw new HTTPException(404, { message: "Cycle not found" });
  await validateWorkspaceAccess(userId, cycle.workspaceId, c.get("apiKey")?.id);
  c.set("workspaceId", cycle.workspaceId);
  return next();
}

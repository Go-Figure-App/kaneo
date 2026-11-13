import { eq } from "drizzle-orm";
import { projectTable, taskTable } from "../../database/schema";
import {
  cycleTable,
  initiativeTable,
  savedViewTable,
} from "../../database/schema-parity";
import type { DbOrTx } from "../../project-access/db-or-tx";
import type { FavoriteTarget } from "./schema";

// Used only to enforce the route's workspace when deleting an owned bookmark.
// It returns no target metadata, including when access was revoked.
export async function favoriteWorkspace(
  database: DbOrTx,
  target: FavoriteTarget,
) {
  if (target.kind === "task") {
    const [row] = await database
      .select({ workspaceId: projectTable.workspaceId })
      .from(taskTable)
      .innerJoin(projectTable, eq(projectTable.id, taskTable.projectId))
      .where(eq(taskTable.id, target.targetId));
    return row?.workspaceId;
  }
  const table =
    target.kind === "project"
      ? projectTable
      : target.kind === "cycle"
        ? cycleTable
        : target.kind === "initiative"
          ? initiativeTable
          : savedViewTable;
  const [row] = await database
    .select({ workspaceId: table.workspaceId })
    .from(table)
    .where(eq(table.id, target.targetId));
  return row?.workspaceId;
}

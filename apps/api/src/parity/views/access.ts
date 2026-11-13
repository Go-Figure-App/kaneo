import { and, eq, exists, isNull, or } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import db from "../../database";
import { projectTable } from "../../database/schema";
import { savedViewTable } from "../../database/schema-parity";
import type { DbOrTx } from "../../project-access/db-or-tx";
import { workspaceIsActive } from "../../workspace/archive/active-workspace-sql";
import { readableProjects, type Actor } from "../planning/access";
import { readableViewFilters } from "./filter-access";

export function visibleViews(who: Actor, database: DbOrTx = db) {
  return and(
    eq(savedViewTable.workspaceId, who.workspaceId),
    workspaceIsActive(savedViewTable.workspaceId),
    or(
      and(
        eq(savedViewTable.ownerId, who.userId),
        eq(savedViewTable.shared, false),
      ),
      and(eq(savedViewTable.shared, true), readableViewFilters(who)),
    ),
    or(
      isNull(savedViewTable.projectId),
      exists(
        database
          .select({ id: projectTable.id })
          .from(projectTable)
          .where(
            and(
              eq(projectTable.id, savedViewTable.projectId),
              readableProjects(who),
            ),
          ),
      ),
    ),
  );
}
export async function findSavedView(
  id: string,
  who: Actor,
  database: DbOrTx = db,
  lock = false,
) {
  const query = database
    .select()
    .from(savedViewTable)
    .where(and(eq(savedViewTable.id, id), visibleViews(who, database)));
  const [view] = await (lock ? query.for("update") : query);
  if (!view) throw new HTTPException(404, { message: "View not found" });
  return view;
}

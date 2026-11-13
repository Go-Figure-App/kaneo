import { and, eq, isNull } from "drizzle-orm";
import type { Context, Next } from "hono";
import { HTTPException } from "hono/http-exception";
import db from "../../database";
import { projectTable } from "../../database/schema";
import {
  initiativeTable,
  projectMilestoneTable,
} from "../../database/schema-parity";
import { assertProjectAccess } from "../../project-access/assert-project-access";
import type { DbOrTx } from "../../project-access/db-or-tx";
import { projectAccessCondition } from "../../project-access/project-access-condition";
import { validateWorkspaceAccess } from "../../utils/validate-workspace-access";
import { workspaceIsActive } from "../../workspace/archive/active-workspace-sql";
import { enabledFeatures } from "../foundation/features";

export type Actor = { userId: string; workspaceId: string };
export type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
export function actor(c: Context): Actor {
  return { userId: c.get("userId"), workspaceId: c.get("workspaceId") };
}

export function readableProjects(who: Actor) {
  return and(
    eq(projectTable.workspaceId, who.workspaceId),
    isNull(projectTable.archivedAt),
    workspaceIsActive(projectTable.workspaceId),
    projectAccessCondition(who.userId, projectTable.id),
  );
}

export async function lockProject(
  tx: Transaction,
  projectId: string,
  who: Actor,
) {
  const [project] = await tx
    .select()
    .from(projectTable)
    .where(and(eq(projectTable.id, projectId), readableProjects(who)))
    .for("update");
  if (!project) throw new HTTPException(404, { message: "Project not found" });
  return project;
}

export async function findInitiative(
  id: string,
  who: Actor,
  database: DbOrTx = db,
  lock = false,
) {
  const query = database
    .select()
    .from(initiativeTable)
    .where(
      and(
        eq(initiativeTable.id, id),
        eq(initiativeTable.workspaceId, who.workspaceId),
        workspaceIsActive(initiativeTable.workspaceId),
      ),
    );
  const [initiative] = await (lock ? query.for("update") : query);
  if (!initiative)
    throw new HTTPException(404, { message: "Initiative not found" });
  return initiative;
}

// The shared middleware cannot resolve fork-owned entities. Keep the same
// workspace/API-key/project checks here, using only the resource's actual scope.
export function planningAccess(
  resource: "milestone" | "initiative" | "status-update",
) {
  return async (c: Context, next: Next) => {
    const userId = c.get("userId");
    if (!userId) throw new HTTPException(401, { message: "Unauthorized" });
    const kind =
      resource === "status-update" ? c.req.param("parentType") : resource;
    if (!["project", "initiative", "milestone"].includes(kind ?? ""))
      throw new HTTPException(400, { message: "Invalid planning resource" });
    const feature = kind === "initiative" ? "initiatives" : "projects";
    if (!enabledFeatures().includes(feature))
      throw new HTTPException(404, { message: "Feature not enabled" });
    const id = c.req.param(resource === "status-update" ? "parentId" : "id");
    if (!id)
      throw new HTTPException(400, {
        message: "Planning resource ID required",
      });
    let workspaceId: string | undefined;
    let projectId: string | undefined;
    if (kind === "initiative") {
      const [row] = await db
        .select({ workspaceId: initiativeTable.workspaceId })
        .from(initiativeTable)
        .where(eq(initiativeTable.id, id));
      workspaceId = row?.workspaceId;
    } else if (kind === "milestone") {
      const [row] = await db
        .select({
          workspaceId: projectTable.workspaceId,
          projectId: projectTable.id,
        })
        .from(projectMilestoneTable)
        .innerJoin(
          projectTable,
          eq(projectTable.id, projectMilestoneTable.projectId),
        )
        .where(
          and(
            eq(projectMilestoneTable.id, id),
            isNull(projectTable.archivedAt),
          ),
        );
      workspaceId = row?.workspaceId;
      projectId = row?.projectId;
    } else {
      const [row] = await db
        .select({
          workspaceId: projectTable.workspaceId,
          projectId: projectTable.id,
        })
        .from(projectTable)
        .where(and(eq(projectTable.id, id), isNull(projectTable.archivedAt)));
      workspaceId = row?.workspaceId;
      projectId = row?.projectId;
    }
    if (!workspaceId)
      throw new HTTPException(404, { message: "Planning resource not found" });
    await validateWorkspaceAccess(userId, workspaceId, c.get("apiKey")?.id);
    if (projectId) await assertProjectAccess(userId, projectId);
    c.set("workspaceId", workspaceId);
    return next();
  };
}

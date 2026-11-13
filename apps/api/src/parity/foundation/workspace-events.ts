import { and, eq, isNull } from "drizzle-orm";
import db from "../../database";
import {
  projectTable,
  workspaceTable,
  workspaceUserTable,
} from "../../database/schema";
import { filterUsersWithProjectAccess } from "../../project-access/filter-users-with-project-access";
import { roleHasWorkspacePermission } from "../../utils/require-workspace-permission";
import { broadcastToUser } from "../../ws";

export const workspaceEventTypes = [
  "INITIATIVE_UPDATED",
  "PROJECT_PLAN_UPDATED",
  "CYCLE_UPDATED",
  "TRIAGE_UPDATED",
  "VIEW_UPDATED",
] as const;
export type WorkspaceEvent = {
  type: (typeof workspaceEventTypes)[number];
  workspaceId: string;
  projectId?: string;
};

export async function broadcastWorkspaceEvent(event: WorkspaceEvent) {
  if (!workspaceEventTypes.includes(event.type)) return;
  if (event.projectId) {
    const [project] = await db
      .select({ id: projectTable.id })
      .from(projectTable)
      .where(
        and(
          eq(projectTable.id, event.projectId),
          eq(projectTable.workspaceId, event.workspaceId),
        ),
      );
    if (!project) return;
  }
  const members = await db
    .select({
      userId: workspaceUserTable.userId,
      role: workspaceUserTable.role,
    })
    .from(workspaceUserTable)
    .innerJoin(
      workspaceTable,
      eq(workspaceTable.id, workspaceUserTable.workspaceId),
    )
    .where(
      and(
        eq(workspaceUserTable.workspaceId, event.workspaceId),
        isNull(workspaceTable.archivedAt),
      ),
    );
  const readers = event.projectId
    ? await filterUsersWithProjectAccess(
        members.map((member) => member.userId),
        event.projectId,
      )
    : new Set(members.map((member) => member.userId));
  for (const member of members) {
    if (!readers.has(member.userId)) continue;
    if (
      !(await roleHasWorkspacePermission(event.workspaceId, member.role, {
        workspace: ["read"],
        ...(event.projectId ? { project: ["read"] } : {}),
      }))
    )
      continue;
    // Hints deliberately contain neither entity IDs nor names/counts from hidden projects.
    broadcastToUser(member.userId, {
      type: event.type,
      workspaceId: event.workspaceId,
    });
  }
}

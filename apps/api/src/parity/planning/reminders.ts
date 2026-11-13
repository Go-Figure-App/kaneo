import { and, eq, inArray, isNull, sql } from "drizzle-orm";
import db from "../../database";
import { projectTable, workspaceUserTable } from "../../database/schema";
import {
  projectExtTable,
  statusUpdateTable,
} from "../../database/schema-parity";
import {
  dispatchNotification,
  persistNotification,
} from "../../notification/controllers/create-notification";
import { projectAccessCondition } from "../../project-access/project-access-condition";
import { withJobLease } from "../../scheduler/leader-lock";
import { roleHasWorkspacePermission } from "../../utils/require-workspace-permission";
import { workspaceIsActive } from "../../workspace/archive/active-workspace-sql";
import { enabledFeatures } from "../foundation/features";

export async function remindProjectLeads(now = new Date()) {
  if (!enabledFeatures().includes("projects")) return;
  return withJobLease(
    "parity-project-update-reminders",
    async () => {
      const at = now.toISOString();
      let cursor:
        | { workspaceId: string; userId: string | null; role: string }
        | undefined;
      const permissionCache = new Map<string, boolean>();
      let reminded = 0;
      // Page past denied leads as well as successful deliveries; a fixed first
      // page can otherwise starve every eligible lead sorting after it.
      while (reminded < 500) {
        const candidates = await db
          .selectDistinct({
            userId: projectExtTable.leadId,
            workspaceId: projectTable.workspaceId,
            role: workspaceUserTable.role,
          })
          .from(projectExtTable)
          .innerJoin(
            projectTable,
            eq(projectTable.id, projectExtTable.projectId),
          )
          .innerJoin(
            workspaceUserTable,
            and(
              eq(workspaceUserTable.userId, projectExtTable.leadId),
              eq(workspaceUserTable.workspaceId, projectTable.workspaceId),
            ),
          )
          .where(
            and(
              cursor
                ? sql`(${projectTable.workspaceId}, ${projectExtTable.leadId}, ${workspaceUserTable.role}) > (${cursor.workspaceId}, ${cursor.userId}, ${cursor.role})`
                : undefined,
              isNull(projectTable.archivedAt),
              workspaceIsActive(projectTable.workspaceId),
              inArray(projectExtTable.status, ["planned", "started", "paused"]),
              projectAccessCondition(
                workspaceUserTable.userId,
                projectTable.id,
              ),
              sql`${projectTable.createdAt} <= (${at}::timestamptz AT TIME ZONE 'UTC') - interval '7 days'`,
              sql`NOT EXISTS (SELECT 1 FROM status_update recent WHERE recent.parent_type = 'project' AND recent.parent_id = ${projectTable.id} AND recent.created_at > ${at}::timestamptz - interval '7 days')`,
              sql`NOT EXISTS (SELECT 1 FROM job_lease receipt WHERE receipt.name = concat('parity-project-update-reminder:', ${projectTable.workspaceId}, ':', ${projectExtTable.leadId}) AND receipt.expires_at >= (${at}::timestamptz AT TIME ZONE 'UTC'))`,
            ),
          )
          .orderBy(
            projectTable.workspaceId,
            projectExtTable.leadId,
            workspaceUserTable.role,
          )
          .limit(500);
        if (!candidates.length) break;
        cursor = candidates[candidates.length - 1];
        for (const candidate of candidates) {
          if (!candidate.userId) continue;
          const permissionKey = JSON.stringify([
            candidate.workspaceId,
            candidate.role,
          ]);
          let allowed = permissionCache.get(permissionKey);
          if (allowed === undefined) {
            allowed = await roleHasWorkspacePermission(
              candidate.workspaceId,
              candidate.role,
              { workspace: ["read"], project: ["read", "update"] },
            );
            permissionCache.set(permissionKey, allowed);
          }
          if (!allowed) continue;
          const name = `parity-project-update-reminder:${candidate.workspaceId}:${candidate.userId}`;
          const notification = await db.transaction(async (tx) => {
            // Durable weekly deduplication reuses the existing lease store. Keep this
            // receipt after dispatch, unlike the short-lived scheduler leader lease.
            const claimed =
              await tx.execute(sql`INSERT INTO job_lease (name, owner, expires_at)
          VALUES (${name}, 'parity-planning', (${at}::timestamptz AT TIME ZONE 'UTC') + interval '7 days')
          ON CONFLICT (name) DO UPDATE SET owner = EXCLUDED.owner, expires_at = EXCLUDED.expires_at
          WHERE job_lease.expires_at < (${at}::timestamptz AT TIME ZONE 'UTC') RETURNING name`);
            if (!claimed.rowCount) return null;
            const created = await persistNotification(
              {
                userId: candidate.userId!,
                type: "project_update_reminder",
                title: "Project update reminder",
                content:
                  "Review the projects you lead and post a weekly status update.",
                resourceType: "workspace",
                resourceId: candidate.workspaceId,
              },
              tx,
            );
            // Workspace-scoped notifications deliberately contain no project data;
            // later grant changes must not expose private names or update content.
            if (!created)
              await tx.execute(
                sql`DELETE FROM job_lease WHERE name = ${name} AND owner = 'parity-planning'`,
              );
            return created;
          });
          if (notification) {
            await dispatchNotification(notification);
            reminded++;
            if (reminded === 500) break;
          }
        }
        if (candidates.length < 500) break;
      }
      return { reminded };
    },
    () => ({ reminded: 0 }),
  );
}

export async function cleanOrphanUpdates() {
  const missingParent = sql`((${statusUpdateTable.parentType} = 'project' AND NOT EXISTS (SELECT 1 FROM project p WHERE p.id = ${statusUpdateTable.parentId}))
    OR (${statusUpdateTable.parentType} = 'initiative' AND NOT EXISTS (SELECT 1 FROM initiative i WHERE i.id = ${statusUpdateTable.parentId})))`;
  const rows = await db
    .select({ id: statusUpdateTable.id })
    .from(statusUpdateTable)
    .where(missingParent)
    .orderBy(statusUpdateTable.id)
    .limit(500);
  if (rows.length)
    await db.delete(statusUpdateTable).where(
      and(
        inArray(
          statusUpdateTable.id,
          rows.map((row) => row.id),
        ),
        missingParent,
      ),
    );
}

export async function planningTick() {
  if (
    !enabledFeatures().some(
      (feature) => feature === "projects" || feature === "initiatives",
    )
  )
    return;
  await cleanOrphanUpdates();
  await remindProjectLeads();
}

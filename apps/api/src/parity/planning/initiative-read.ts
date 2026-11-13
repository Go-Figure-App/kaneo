import { and, asc, eq, inArray, isNull } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import db from "../../database";
import { projectTable, userTable } from "../../database/schema";
import {
  initiativeProjectTable,
  initiativeTable,
} from "../../database/schema-parity";
import { findInitiative, readableProjects, type Actor } from "./access";
import { addCounts, progress } from "./progress";
import { estimatesEnabled } from "./progress-query";
import { projectSummaries } from "./project-read";
import { latestUpdates } from "./status-updates";

export async function linkedProjects(ids: string[], who: Actor) {
  if (!ids.length) return [];
  return db
    .select({
      initiativeId: initiativeProjectTable.initiativeId,
      projectId: projectTable.id,
      position: initiativeProjectTable.position,
    })
    .from(initiativeProjectTable)
    .innerJoin(
      projectTable,
      eq(projectTable.id, initiativeProjectTable.projectId),
    )
    .innerJoin(
      initiativeTable,
      and(
        eq(initiativeTable.id, initiativeProjectTable.initiativeId),
        eq(initiativeTable.workspaceId, projectTable.workspaceId),
      ),
    )
    .where(and(inArray(initiativeTable.id, ids), readableProjects(who)))
    .orderBy(asc(initiativeProjectTable.position), asc(projectTable.id));
}

async function summaries(ids: string[], who: Actor) {
  if (!ids.length) return [];
  const [rows, links, updates, estimates] = await Promise.all([
    db
      .select({ initiative: initiativeTable, ownerName: userTable.name })
      .from(initiativeTable)
      .leftJoin(userTable, eq(userTable.id, initiativeTable.ownerId))
      .where(
        and(
          inArray(initiativeTable.id, ids),
          eq(initiativeTable.workspaceId, who.workspaceId),
        ),
      )
      .orderBy(asc(initiativeTable.position), asc(initiativeTable.id)),
    linkedProjects(ids, who),
    latestUpdates("initiative", ids),
    estimatesEnabled(who.workspaceId),
  ]);
  const projects = await projectSummaries(who, [
    ...new Set(links.map((link) => link.projectId)),
  ]);
  const byId = new Map(projects.map((project) => [project.id, project]));
  const latest = new Map(updates.map((update) => [update.parentId, update]));
  return rows.map(({ initiative, ownerName }) => {
    const visible = links
      .filter((link) => link.initiativeId === initiative.id)
      .flatMap((link) => {
        const project = byId.get(link.projectId);
        return project ? [project] : [];
      });
    return {
      ...initiative,
      ownerName,
      projectCount: visible.length,
      latestUpdate: latest.get(initiative.id) ?? null,
      progress: progress(
        addCounts(
          visible.map((project) => ({
            ...project.progress,
            totalPoints: project.progress.totalPoints ?? 0,
            completedPoints: project.progress.completedPoints ?? 0,
          })),
        ),
        estimates,
      ),
    };
  });
}

export async function listInitiatives(
  who: Actor,
  page: number,
  pageSize: number,
  includeArchived: boolean,
) {
  const rows = await db
    .select({ id: initiativeTable.id })
    .from(initiativeTable)
    .where(
      and(
        eq(initiativeTable.workspaceId, who.workspaceId),
        includeArchived ? undefined : isNull(initiativeTable.archivedAt),
      ),
    )
    .orderBy(asc(initiativeTable.position), asc(initiativeTable.id))
    .limit(pageSize + 1)
    .offset((page - 1) * pageSize);
  return {
    items: await summaries(
      rows.slice(0, pageSize).map((row) => row.id),
      who,
    ),
    hasMore: rows.length > pageSize,
    page,
    pageSize,
  };
}

export async function getInitiative(id: string, who: Actor) {
  await findInitiative(id, who);
  const [initiative] = await summaries([id], who);
  if (!initiative)
    throw new HTTPException(404, { message: "Initiative not found" });
  const links = await linkedProjects([id], who);
  const projects = await projectSummaries(
    who,
    links.map((link) => link.projectId),
  );
  const positions = new Map(
    links.map((link) => [link.projectId, link.position]),
  );
  projects.sort(
    (a, b) =>
      (positions.get(a.id) ?? 0) - (positions.get(b.id) ?? 0) ||
      a.id.localeCompare(b.id),
  );
  return { ...initiative, projects };
}

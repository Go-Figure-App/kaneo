import { and, asc, eq, inArray } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import db from "../../database";
import { projectTable, userTable } from "../../database/schema";
import {
  projectExtTable,
  projectMilestoneTable,
} from "../../database/schema-parity";
import { readableProjects, type Actor } from "./access";
import { emptyCounts, progress } from "./progress";
import { estimatesEnabled, progressCounts } from "./progress-query";
import { latestUpdates } from "./status-updates";

export async function projectSummaries(who: Actor, ids?: string[]) {
  if (ids?.length === 0) return [];
  const rows = await db
    .select({
      id: projectTable.id,
      workspaceId: projectTable.workspaceId,
      name: projectTable.name,
      slug: projectTable.slug,
      icon: projectTable.icon,
      description: projectTable.description,
      status: projectExtTable.status,
      health: projectExtTable.health,
      leadId: projectExtTable.leadId,
      leadName: userTable.name,
      startDate: projectExtTable.startDate,
      targetDate: projectExtTable.targetDate,
      priority: projectExtTable.priority,
    })
    .from(projectTable)
    .leftJoin(projectExtTable, eq(projectExtTable.projectId, projectTable.id))
    .leftJoin(userTable, eq(userTable.id, projectExtTable.leadId))
    .where(
      and(
        readableProjects(who),
        ids ? inArray(projectTable.id, ids) : undefined,
      ),
    )
    .orderBy(asc(projectTable.name), asc(projectTable.id));
  const projectIds = rows.map((row) => row.id);
  const [counts, estimates, updates] = await Promise.all([
    progressCounts(projectIds),
    estimatesEnabled(who.workspaceId),
    latestUpdates("project", projectIds),
  ]);
  const latest = new Map(updates.map((update) => [update.parentId, update]));
  return rows.map((row) => ({
    ...row,
    status: row.status ?? ("backlog" as const),
    health: row.health ?? ("on_track" as const),
    priority: row.priority ?? ("no-priority" as const),
    progress: progress(counts.projects.get(row.id) ?? emptyCounts(), estimates),
    latestUpdate: latest.get(row.id) ?? null,
  }));
}

export async function listProjectPlans(
  who: Actor,
  page: number,
  pageSize: number,
) {
  const ids = await db
    .select({ id: projectTable.id })
    .from(projectTable)
    .where(readableProjects(who))
    .orderBy(asc(projectTable.name), asc(projectTable.id))
    .limit(pageSize + 1)
    .offset((page - 1) * pageSize);
  return {
    items: await projectSummaries(
      who,
      ids.slice(0, pageSize).map((row) => row.id),
    ),
    hasMore: ids.length > pageSize,
    page,
    pageSize,
  };
}

export async function listMilestones(projectId: string, who: Actor) {
  const [project] = await db
    .select({ id: projectTable.id })
    .from(projectTable)
    .where(and(eq(projectTable.id, projectId), readableProjects(who)));
  if (!project) throw new HTTPException(404, { message: "Project not found" });
  const [rows, counts, estimates] = await Promise.all([
    db
      .select({ milestone: projectMilestoneTable })
      .from(projectMilestoneTable)
      .innerJoin(
        projectTable,
        eq(projectTable.id, projectMilestoneTable.projectId),
      )
      .where(and(eq(projectTable.id, projectId), readableProjects(who)))
      .orderBy(
        asc(projectMilestoneTable.position),
        asc(projectMilestoneTable.id),
      ),
    progressCounts([projectId]),
    estimatesEnabled(who.workspaceId),
  ]);
  return rows.map(({ milestone }) => ({
    ...milestone,
    progress: progress(
      counts.milestones.get(milestone.id) ?? emptyCounts(),
      estimates,
    ),
  }));
}

export async function getProjectPlan(projectId: string, who: Actor) {
  const [project] = await projectSummaries(who, [projectId]);
  if (!project) throw new HTTPException(404, { message: "Project not found" });
  return { ...project, milestones: await listMilestones(projectId, who) };
}

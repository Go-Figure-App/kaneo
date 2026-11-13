import { and, asc, eq, inArray, isNull } from "drizzle-orm";
import db from "../../database";
import { projectTable, userTable } from "../../database/schema";
import {
  initiativeProjectTable,
  initiativeTable,
  projectExtTable,
  projectMilestoneTable,
} from "../../database/schema-parity";
import { readableProjects, type Actor } from "../planning/access";
import { emptyCounts, progress } from "../planning/progress";
import { estimatesEnabled, progressCounts } from "../planning/progress-query";

export async function getRoadmap(who: Actor) {
  // One compact workspace snapshot; omit descriptions/update bodies and batch
  // aggregates so adding a project never adds another database round trip.
  const rows = await db
    .select({
      id: projectTable.id,
      workspaceId: projectTable.workspaceId,
      name: projectTable.name,
      slug: projectTable.slug,
      icon: projectTable.icon,
      status: projectExtTable.status,
      health: projectExtTable.health,
      leadId: projectExtTable.leadId,
      leadName: userTable.name,
      leadImage: userTable.image,
      startDate: projectExtTable.startDate,
      targetDate: projectExtTable.targetDate,
      priority: projectExtTable.priority,
    })
    .from(projectTable)
    .leftJoin(projectExtTable, eq(projectExtTable.projectId, projectTable.id))
    .leftJoin(userTable, eq(userTable.id, projectExtTable.leadId))
    .where(readableProjects(who))
    .orderBy(asc(projectTable.name), asc(projectTable.id));
  if (!rows.length) return { projects: [], initiatives: [] };
  const ids = rows.map((row) => row.id);
  const [links, milestones, counts, estimates] = await Promise.all([
    db
      .select({
        projectId: projectTable.id,
        initiative: {
          id: initiativeTable.id,
          name: initiativeTable.name,
          color: initiativeTable.color,
          position: initiativeTable.position,
        },
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
      .where(
        and(
          readableProjects(who),
          inArray(projectTable.id, ids),
          isNull(initiativeTable.archivedAt),
        ),
      )
      .orderBy(asc(initiativeTable.position), asc(initiativeTable.id)),
    db
      .select({
        id: projectMilestoneTable.id,
        projectId: projectMilestoneTable.projectId,
        name: projectMilestoneTable.name,
        targetDate: projectMilestoneTable.targetDate,
        position: projectMilestoneTable.position,
      })
      .from(projectMilestoneTable)
      .innerJoin(
        projectTable,
        eq(projectTable.id, projectMilestoneTable.projectId),
      )
      .where(and(readableProjects(who), inArray(projectTable.id, ids)))
      .orderBy(
        asc(projectMilestoneTable.position),
        asc(projectMilestoneTable.id),
      ),
    progressCounts(ids),
    estimatesEnabled(who.workspaceId),
  ]);
  const initiatives = new Map(
    links.map((link) => [link.initiative.id, link.initiative]),
  );
  const projectLinks = new Map<string, string[]>();
  for (const link of links) {
    const group = projectLinks.get(link.projectId) ?? [];
    group.push(link.initiative.id);
    projectLinks.set(link.projectId, group);
  }
  const projectMilestones = new Map<
    string,
    Array<
      (typeof milestones)[number] & { progress: ReturnType<typeof progress> }
    >
  >();
  for (const milestone of milestones) {
    const group = projectMilestones.get(milestone.projectId) ?? [];
    group.push({
      ...milestone,
      progress: progress(
        counts.milestones.get(milestone.id) ?? emptyCounts(),
        estimates,
      ),
    });
    projectMilestones.set(milestone.projectId, group);
  }
  return {
    initiatives: [...initiatives.values()],
    projects: rows.map((row) => ({
      ...row,
      status: row.status ?? ("backlog" as const),
      health: row.health ?? ("on_track" as const),
      priority: row.priority ?? ("no-priority" as const),
      progress: progress(
        counts.projects.get(row.id) ?? emptyCounts(),
        estimates,
      ),
      initiativeIds: projectLinks.get(row.id) ?? [],
      milestones: projectMilestones.get(row.id) ?? [],
    })),
  };
}

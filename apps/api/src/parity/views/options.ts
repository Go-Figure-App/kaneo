import { and, asc, desc, eq, isNull } from "drizzle-orm";
import db from "../../database";
import {
  labelTable,
  projectTable,
  userTable,
  workspaceUserTable,
} from "../../database/schema";
import {
  cycleTable,
  projectMilestoneTable,
} from "../../database/schema-parity";
import { cycleSettings } from "../cycles/settings-read";
import { readableProjects, type Actor } from "../planning/access";

export async function viewOptions(who: Actor, projectId?: string) {
  const [projects, users, labels, cycles, milestones, settings] =
    await Promise.all([
      db
        .select({ id: projectTable.id, name: projectTable.name })
        .from(projectTable)
        .where(readableProjects(who))
        .orderBy(asc(projectTable.name), asc(projectTable.id))
        .limit(1001),
      db
        .select({ id: userTable.id, name: userTable.name })
        .from(userTable)
        .innerJoin(
          workspaceUserTable,
          eq(workspaceUserTable.userId, userTable.id),
        )
        .where(eq(workspaceUserTable.workspaceId, who.workspaceId))
        .orderBy(asc(userTable.name), asc(userTable.id))
        .limit(1001),
      db
        .selectDistinct({ name: labelTable.name, color: labelTable.color })
        .from(labelTable)
        .where(
          and(
            eq(labelTable.workspaceId, who.workspaceId),
            isNull(labelTable.taskId),
            isNull(labelTable.deletionStartedAt),
          ),
        )
        .orderBy(asc(labelTable.name))
        .limit(1001),
      db
        .select({
          id: cycleTable.id,
          name: cycleTable.name,
          number: cycleTable.number,
        })
        .from(cycleTable)
        .where(eq(cycleTable.workspaceId, who.workspaceId))
        .orderBy(desc(cycleTable.number))
        .limit(1001),
      db
        .select({
          id: projectMilestoneTable.id,
          name: projectMilestoneTable.name,
          projectId: projectTable.id,
          projectName: projectTable.name,
        })
        .from(projectMilestoneTable)
        .innerJoin(
          projectTable,
          eq(projectTable.id, projectMilestoneTable.projectId),
        )
        .where(
          and(
            readableProjects(who),
            projectId ? eq(projectTable.id, projectId) : undefined,
          ),
        )
        .orderBy(
          asc(projectTable.name),
          asc(projectMilestoneTable.position),
          asc(projectMilestoneTable.id),
        )
        .limit(1001),
      cycleSettings(who.workspaceId),
    ]);
  return {
    projects: projects.slice(0, 1000),
    users: users.slice(0, 1000),
    labels: labels.slice(0, 1000),
    cycles: cycles.slice(0, 1000),
    milestones: milestones.slice(0, 1000),
    estimateScale: settings.estimateScale,
    timeZone: settings.timeZone,
    truncated: [projects, users, labels, cycles, milestones].some(
      (rows) => rows.length > 1000,
    ),
  };
}

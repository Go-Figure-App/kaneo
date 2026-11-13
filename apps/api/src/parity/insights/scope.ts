import { and, eq, inArray, isNull } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import db from "../../database";
import { projectTable } from "../../database/schema";
import { initiativeProjectTable } from "../../database/schema-parity";
import { findCycle } from "../cycles/access";
import { cycleSettings } from "../cycles/settings-read";
import {
  findInitiative,
  readableProjects,
  type Actor,
} from "../planning/access";
import type { InsightsQuery } from "./schema";

export async function reportScope(who: Actor, query: InsightsQuery) {
  const [projects, settings] = await Promise.all([
    db
      .select({ id: projectTable.id })
      .from(projectTable)
      .where(readableProjects(who))
      .orderBy(projectTable.id),
    cycleSettings(who.workspaceId),
  ]);
  let projectIds = projects.map((project) => project.id);
  if (query.projectId) {
    if (!projectIds.includes(query.projectId))
      throw new HTTPException(404, { message: "Project not found" });
    projectIds = [query.projectId];
  }
  if (query.initiativeId) {
    const initiative = await findInitiative(query.initiativeId, who);
    if (initiative.archivedAt)
      throw new HTTPException(404, { message: "Initiative not found" });
    const linked = projectIds.length
      ? await db
          .select({ id: projectTable.id })
          .from(initiativeProjectTable)
          .innerJoin(
            projectTable,
            eq(projectTable.id, initiativeProjectTable.projectId),
          )
          .where(
            and(
              eq(initiativeProjectTable.initiativeId, query.initiativeId),
              inArray(projectTable.id, projectIds),
              isNull(projectTable.archivedAt),
            ),
          )
      : [];
    projectIds = linked.map((project) => project.id).sort();
  }
  const cycle = query.cycleId ? await findCycle(query.cycleId, who) : undefined;
  return { projectIds, settings, cycle };
}
export type ReportScope = Awaited<ReturnType<typeof reportScope>>;

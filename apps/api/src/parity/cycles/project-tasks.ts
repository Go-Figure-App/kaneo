import { and, eq, gt, isNull, lte } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import db from "../../database";
import { projectTable, taskTable } from "../../database/schema";
import { cycleTable, taskExtTable } from "../../database/schema-parity";
import { readableProjects, type Actor } from "../planning/access";
import { acceptedTaskCondition } from "../triage/visibility";
import { cycleSettings } from "./settings-read";

// Compact metadata for a project's board/list: one request, not one per card.
export async function projectCycleTasks(projectId: string, who: Actor) {
  const [project] = await db
    .select({ id: projectTable.id })
    .from(projectTable)
    .where(and(eq(projectTable.id, projectId), readableProjects(who)));
  if (!project) throw new HTTPException(404, { message: "Project not found" });
  const settings = await cycleSettings(who.workspaceId);
  const now = new Date();
  const [current] = settings.cyclesEnabled
    ? await db
        .select({ id: cycleTable.id })
        .from(cycleTable)
        .where(
          and(
            eq(cycleTable.workspaceId, who.workspaceId),
            isNull(cycleTable.completedAt),
            lte(cycleTable.startsAt, now),
            gt(cycleTable.endsAt, now),
          ),
        )
        .limit(1)
    : [];
  const items = await db
    .select({ taskId: taskTable.id, cycleId: cycleTable.id })
    .from(taskTable)
    .innerJoin(projectTable, eq(projectTable.id, taskTable.projectId))
    .innerJoin(taskExtTable, eq(taskExtTable.taskId, taskTable.id))
    .innerJoin(
      cycleTable,
      and(
        eq(cycleTable.id, taskExtTable.cycleId),
        eq(cycleTable.workspaceId, projectTable.workspaceId),
      ),
    )
    .where(
      and(
        eq(taskTable.projectId, projectId),
        readableProjects(who),
        acceptedTaskCondition(taskTable.id),
      ),
    );
  return { items, currentCycleId: current?.id ?? null };
}

import { and, eq } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import db from "../../database";
import { projectTable, taskTable } from "../../database/schema";
import { cycleTable, taskExtTable } from "../../database/schema-parity";
import { readableProjects, type Actor } from "../planning/access";
import { acceptedTaskCondition } from "../triage/visibility";
import { cycleSettings } from "./settings-read";

export async function getTaskCycleProperties(taskId: string, who: Actor) {
  const [row] = await db
    .select({
      taskId: taskTable.id,
      estimate: taskExtTable.estimate,
      cycle: {
        id: cycleTable.id,
        number: cycleTable.number,
        name: cycleTable.name,
        startsAt: cycleTable.startsAt,
        endsAt: cycleTable.endsAt,
        completedAt: cycleTable.completedAt,
      },
    })
    .from(taskTable)
    .innerJoin(projectTable, eq(projectTable.id, taskTable.projectId))
    .leftJoin(taskExtTable, eq(taskExtTable.taskId, taskTable.id))
    .leftJoin(
      cycleTable,
      and(
        eq(cycleTable.id, taskExtTable.cycleId),
        eq(cycleTable.workspaceId, projectTable.workspaceId),
      ),
    )
    .where(
      and(
        eq(taskTable.id, taskId),
        readableProjects(who),
        acceptedTaskCondition(taskTable.id),
      ),
    );
  if (!row) throw new HTTPException(404, { message: "Task not found" });
  const settings = await cycleSettings(who.workspaceId);
  return {
    ...row,
    estimateScale: settings.estimateScale,
    cyclesEnabled: settings.cyclesEnabled,
  };
}

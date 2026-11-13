import { and, eq, inArray, isNull, or } from "drizzle-orm";
import {
  activityTable,
  columnTable,
  projectTable,
  taskTable,
} from "../../database/schema";
import {
  columnExtTable,
  cycleTable,
  taskExtTable,
} from "../../database/schema-parity";
import type { Transaction } from "../planning/access";
import { taskCategory } from "../planning/progress-query";
import { acceptedTaskCondition } from "../triage/visibility";
import { estimatePoints, type EstimateScale } from "./estimates";
import { emptyTotals, sumTotals, type ProjectCycleSummary } from "./totals";
import { taskTotalsByProject } from "./task-totals";

type Cycle = typeof cycleTable.$inferSelect;

// Called with the workspace lock held. Lock projects before tasks, matching moves.
export async function closeCycle(
  tx: Transaction,
  cycle: Cycle,
  next: Cycle | null,
  scale: EstimateScale,
  now: Date,
) {
  await tx
    .select({ id: projectTable.id })
    .from(projectTable)
    .where(
      and(
        eq(projectTable.workspaceId, cycle.workspaceId),
        isNull(projectTable.archivedAt),
      ),
    )
    .orderBy(projectTable.id)
    .for("update");
  const tasks = await tx
    .select({
      taskId: taskTable.id,
      projectId: taskTable.projectId,
      category: taskCategory,
      estimate: taskExtTable.estimate,
    })
    .from(taskTable)
    .innerJoin(projectTable, eq(projectTable.id, taskTable.projectId))
    .innerJoin(taskExtTable, eq(taskExtTable.taskId, taskTable.id))
    .leftJoin(
      columnTable,
      and(
        eq(columnTable.projectId, taskTable.projectId),
        or(
          eq(columnTable.id, taskTable.columnId),
          and(
            isNull(taskTable.columnId),
            eq(columnTable.slug, taskTable.status),
          ),
        ),
      ),
    )
    .leftJoin(columnExtTable, eq(columnExtTable.columnId, columnTable.id))
    .where(
      and(
        eq(taskExtTable.cycleId, cycle.id),
        eq(projectTable.workspaceId, cycle.workspaceId),
        isNull(projectTable.archivedAt),
        acceptedTaskCondition(taskTable.id),
      ),
    )
    .orderBy(taskTable.id)
    .for("update", { of: taskTable });
  // Use the same read of workflow categories for both closing totals and rollover.
  const rows = taskTotalsByProject(tasks, scale);
  const totals = sumTotals(rows.values());
  const rolledOver = next
    ? tasks.filter(
        (task) => task.category !== "completed" && task.category !== "canceled",
      )
    : [];
  const projectTotals: Record<string, ProjectCycleSummary> = Object.fromEntries(
    [...rows].map(([projectId, counts]) => [
      projectId,
      { ...counts, rolledOverCount: 0, rolledOverPoints: 0 },
    ]),
  );
  for (const task of rolledOver) {
    const counts = projectTotals[task.projectId] ?? {
      ...emptyTotals(),
      rolledOverCount: 0,
      rolledOverPoints: 0,
    };
    counts.rolledOverCount++;
    counts.rolledOverPoints += estimatePoints(task.estimate, scale);
    projectTotals[task.projectId] = counts;
  }
  await tx
    .update(cycleTable)
    .set({
      completedAt: now,
      summary: {
        ...totals,
        projectTotals,
        rolledOverCount: rolledOver.length,
        rolledOverPoints: rolledOver.reduce(
          (sum, task) => sum + estimatePoints(task.estimate, scale),
          0,
        ),
      },
    })
    .where(and(eq(cycleTable.id, cycle.id), isNull(cycleTable.completedAt)));
  if (next) {
    // Bound parameter counts for large cycles; all batches commit together.
    for (let offset = 0; offset < rolledOver.length; offset += 200) {
      const batch = rolledOver.slice(offset, offset + 200);
      await tx
        .update(taskExtTable)
        .set({ cycleId: next.id })
        .where(
          and(
            inArray(
              taskExtTable.taskId,
              batch.map((task) => task.taskId),
            ),
            eq(taskExtTable.cycleId, cycle.id),
          ),
        );
      await tx.insert(activityTable).values(
        batch.map((task) => ({
          taskId: task.taskId,
          type: "cycle_changed",
          userId: null,
          eventData: {
            oldCycleId: cycle.id,
            cycleId: next.id,
            rolledOver: true,
          },
        })),
      );
    }
  }
  return rolledOver.map((task) => ({
    taskId: task.taskId,
    projectId: task.projectId,
  }));
}

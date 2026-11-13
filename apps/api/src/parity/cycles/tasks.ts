import { and, eq, exists, ilike, inArray, isNull, or, sql } from "drizzle-orm";
import db from "../../database";
import {
  columnTable,
  labelTable,
  projectTable,
  taskTable,
  userTable,
} from "../../database/schema";
import { columnExtTable, taskExtTable } from "../../database/schema-parity";
import { readableProjects, type Actor } from "../planning/access";
import { taskCategory } from "../planning/progress-query";
import { acceptedTaskCondition } from "../triage/visibility";
import { findCycle } from "./access";
import type { CycleTaskQuery } from "./schema";

export async function getCycleTasks(
  id: string,
  who: Actor,
  query: CycleTaskQuery,
) {
  await findCycle(id, who);
  const { page, pageSize } = query;
  const rows = await db
    .select({
      id: taskTable.id,
      projectId: taskTable.projectId,
      projectName: projectTable.name,
      projectSlug: projectTable.slug,
      title: taskTable.title,
      number: taskTable.number,
      status: taskTable.status,
      statusName: sql<string>`coalesce(${columnTable.name}, ${taskTable.status})`,
      category: taskCategory,
      priority: taskTable.priority,
      userId: taskTable.userId,
      assigneeName: userTable.name,
      estimate: taskExtTable.estimate,
      dueDate: taskTable.dueDate,
    })
    .from(taskTable)
    .innerJoin(projectTable, eq(projectTable.id, taskTable.projectId))
    .innerJoin(taskExtTable, eq(taskExtTable.taskId, taskTable.id))
    .leftJoin(userTable, eq(userTable.id, taskTable.userId))
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
        eq(taskExtTable.cycleId, id),
        readableProjects(who),
        acceptedTaskCondition(taskTable.id),
        query.projectId ? eq(taskTable.projectId, query.projectId) : undefined,
        query.assigneeId === "unassigned"
          ? isNull(taskTable.userId)
          : query.assigneeId
            ? eq(taskTable.userId, query.assigneeId)
            : undefined,
        query.category ? eq(taskCategory, query.category) : undefined,
        query.status ? eq(taskTable.status, query.status) : undefined,
        query.priority ? eq(taskTable.priority, query.priority) : undefined,
        query.search
          ? ilike(
              taskTable.title,
              `%${query.search.replace(/[\\%_]/g, "\\$&")}%`,
            )
          : undefined,
        query.label
          ? exists(
              db
                .select({ id: labelTable.id })
                .from(labelTable)
                .where(
                  and(
                    eq(labelTable.taskId, taskTable.id),
                    eq(labelTable.name, query.label),
                    isNull(labelTable.deletionStartedAt),
                  ),
                ),
            )
          : undefined,
      ),
    )
    .orderBy(projectTable.name, taskTable.position, taskTable.id)
    .limit(pageSize + 1)
    .offset((page - 1) * pageSize);
  const items = rows.slice(0, pageSize);
  const labels = items.length
    ? await db
        .select({
          taskId: labelTable.taskId,
          name: labelTable.name,
          color: labelTable.color,
        })
        .from(labelTable)
        .where(
          and(
            inArray(
              labelTable.taskId,
              items.map((task) => task.id),
            ),
            isNull(labelTable.deletionStartedAt),
          ),
        )
        .orderBy(labelTable.name)
    : [];
  const byTask = new Map<string, { name: string; color: string }[]>();
  for (const label of labels) {
    if (!label.taskId) continue;
    const group = byTask.get(label.taskId) ?? [];
    group.push({ name: label.name, color: label.color });
    byTask.set(label.taskId, group);
  }
  return {
    items: items.map((task) => ({
      ...task,
      labels: byTask.get(task.id) ?? [],
    })),
    page,
    pageSize,
    hasMore: rows.length > pageSize,
  };
}

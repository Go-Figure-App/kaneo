import {
  and,
  asc,
  desc,
  eq,
  ilike,
  inArray,
  isNull,
  or,
  sql,
} from "drizzle-orm";
import db from "../../database";
import { originalIdentifierMatches } from "../import/search";
import {
  columnTable,
  labelTable,
  projectTable,
  taskTable,
  userTable,
} from "../../database/schema";
import {
  columnExtTable,
  cycleTable,
  projectMilestoneTable,
  taskExtTable,
} from "../../database/schema-parity";
import { cycleSettings } from "../cycles/settings-read";
import { readableProjects, type Actor } from "../planning/access";
import { taskCategory } from "../planning/progress-query";
import { acceptedTaskCondition } from "../triage/visibility";
import { projectAccessCondition } from "../../project-access/project-access-condition";
import { workspaceIsActive } from "../../workspace/archive/active-workspace-sql";
import {
  parseTaskFilters,
  taskCreatedAt,
  taskCreator,
  taskDueDate,
  taskFilterSql,
  taskUpdatedAt,
} from "./task-filters";
import type { WorkspaceTaskQuery } from "./schema";

export async function listWorkspaceTasks(
  who: Actor,
  query: WorkspaceTaskQuery,
) {
  const filters = parseTaskFilters(query.filters);
  const settings = await cycleSettings(who.workspaceId);
  const order =
    query.orderBy === "priority"
      ? sql`case ${taskTable.priority} when 'urgent' then 0 when 'high' then 1 when 'medium' then 2 when 'low' then 3 else 4 end`
      : query.orderBy === "created"
        ? taskTable.createdAt
        : query.orderBy === "updated"
          ? taskTable.updatedAt
          : taskTable.dueDate;
  const needle = query.search
    ? `%${query.search.replace(/[\\%_]/g, "\\$&")}%`
    : undefined;
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
      creatorId: taskCreator,
      cycleId: cycleTable.id,
      cycleName: sql<
        string | null
      >`case when ${cycleTable.id} is not null then coalesce(${cycleTable.name}, ${cycleTable.number}::text) end`,
      milestoneId: projectMilestoneTable.id,
      milestoneName: projectMilestoneTable.name,
      estimate: taskExtTable.estimate,
      dueDate: taskDueDate,
      createdAt: taskCreatedAt,
      updatedAt: taskUpdatedAt,
      completedAt: taskExtTable.completedAt,
    })
    .from(taskTable)
    .innerJoin(projectTable, eq(projectTable.id, taskTable.projectId))
    .leftJoin(taskExtTable, eq(taskExtTable.taskId, taskTable.id))
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
    .leftJoin(
      cycleTable,
      and(
        eq(cycleTable.id, taskExtTable.cycleId),
        eq(cycleTable.workspaceId, projectTable.workspaceId),
      ),
    )
    .leftJoin(
      projectMilestoneTable,
      and(
        eq(projectMilestoneTable.id, taskExtTable.milestoneId),
        eq(projectMilestoneTable.projectId, taskTable.projectId),
      ),
    )
    .where(
      and(
        query.includeArchivedProjects === "true"
          ? and(
              eq(projectTable.workspaceId, who.workspaceId),
              workspaceIsActive(projectTable.workspaceId),
              projectAccessCondition(who.userId, projectTable.id),
            )
          : readableProjects(who),
        acceptedTaskCondition(taskTable.id),
        query.projectId ? eq(taskTable.projectId, query.projectId) : undefined,
        ...filters.map((filter) => taskFilterSql(filter, settings.timeZone)),
        needle
          ? or(
              ilike(taskTable.title, needle),
              originalIdentifierMatches(query.search ?? ""),
              sql`concat(${projectTable.slug}, '-', ${taskTable.number}::text) ilike ${needle}`,
            )
          : undefined,
      ),
    )
    .orderBy(
      sql`${query.direction === "asc" ? asc(order) : desc(order)} nulls last`,
      asc(taskTable.id),
    )
    .limit(query.pageSize + 1)
    .offset((query.page - 1) * query.pageSize);
  const items = rows.slice(0, query.pageSize);
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
    page: query.page,
    pageSize: query.pageSize,
    hasMore: rows.length > query.pageSize,
    timeZone: settings.timeZone,
  };
}

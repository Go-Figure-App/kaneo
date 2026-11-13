import { and, asc, count, eq, isNull, lte, or } from "drizzle-orm";
import db from "../../../database";
import { projectTable, taskTable, userTable } from "../../../database/schema";
import { projectExtTable, taskExtTable } from "../../../database/schema-parity";
import { projectAccessCondition } from "../../../project-access/project-access-condition";
import { boardDescription } from "../../../task/description-pages";

function pendingCondition(
  workspaceId: string,
  userId: string,
  projectId?: string,
) {
  return and(
    eq(projectTable.workspaceId, workspaceId),
    isNull(projectTable.archivedAt),
    projectAccessCondition(userId, projectTable.id),
    projectId ? eq(projectTable.id, projectId) : undefined,
    eq(taskExtTable.triageState, "pending"),
    or(
      isNull(taskExtTable.snoozedUntil),
      lte(taskExtTable.snoozedUntil, new Date()),
    ),
  );
}

export async function triageCount(
  workspaceId: string,
  userId: string,
  projectId?: string,
) {
  const [total] = await db
    .select({ value: count() })
    .from(taskTable)
    .innerJoin(taskExtTable, eq(taskExtTable.taskId, taskTable.id))
    .innerJoin(projectTable, eq(projectTable.id, taskTable.projectId))
    .where(pendingCondition(workspaceId, userId, projectId));
  return Number(total?.value ?? 0);
}

export async function listTriage(
  workspaceId: string,
  userId: string,
  options: { projectId?: string; page?: number; pageSize?: number } = {},
) {
  const page = options.page ?? 1;
  const pageSize = options.pageSize ?? 50;
  const where = pendingCondition(workspaceId, userId, options.projectId);
  const [items, [total]] = await Promise.all([
    db
      .select({
        id: taskTable.id,
        projectId: taskTable.projectId,
        title: taskTable.title,
        description: boardDescription,
        number: taskTable.number,
        status: taskTable.status,
        priority: taskTable.priority,
        userId: taskTable.userId,
        assigneeName: userTable.name,
        projectName: projectTable.name,
        projectSlug: projectTable.slug,
        createdAt: taskTable.createdAt,
        source: taskExtTable.triageSource,
        snoozedUntil: taskExtTable.snoozedUntil,
      })
      .from(taskTable)
      .innerJoin(taskExtTable, eq(taskExtTable.taskId, taskTable.id))
      .innerJoin(projectTable, eq(projectTable.id, taskTable.projectId))
      .leftJoin(userTable, eq(userTable.id, taskTable.userId))
      .where(where)
      .orderBy(asc(taskTable.createdAt), asc(taskTable.id))
      .limit(pageSize)
      .offset((page - 1) * pageSize),
    db
      .select({ value: count() })
      .from(taskTable)
      .innerJoin(taskExtTable, eq(taskExtTable.taskId, taskTable.id))
      .innerJoin(projectTable, eq(projectTable.id, taskTable.projectId))
      .where(where),
  ]);
  return { items, total: Number(total?.value ?? 0), page, pageSize };
}

export async function triageProjects(workspaceId: string, userId: string) {
  return db
    .select({
      id: projectTable.id,
      name: projectTable.name,
      slug: projectTable.slug,
    })
    .from(projectTable)
    .innerJoin(projectExtTable, eq(projectExtTable.projectId, projectTable.id))
    .where(
      and(
        eq(projectTable.workspaceId, workspaceId),
        eq(projectExtTable.triageEnabled, true),
        isNull(projectTable.archivedAt),
        projectAccessCondition(userId, projectTable.id),
      ),
    )
    .orderBy(asc(projectTable.name), asc(projectTable.id));
}

import { and, asc, eq } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import db from "../../database";
import { projectTable } from "../../database/schema";
import { taskTemplateTable } from "../../database/schema-parity";
import { readableProjects, type Actor } from "../planning/access";
export async function listTaskTemplates(
  projectId: string,
  who: Actor,
  page: number,
  pageSize: number,
) {
  const rows = await db
    .select({
      projectId: taskTemplateTable.projectId,
      name: taskTemplateTable.name,
      title: taskTemplateTable.title,
      description: taskTemplateTable.description,
      defaults: taskTemplateTable.defaults,
    })
    .from(taskTemplateTable)
    .innerJoin(projectTable, eq(projectTable.id, taskTemplateTable.projectId))
    .where(and(eq(projectTable.id, projectId), readableProjects(who)))
    .orderBy(asc(taskTemplateTable.name))
    .limit(pageSize + 1)
    .offset((page - 1) * pageSize);
  return {
    items: rows.slice(0, pageSize),
    page,
    pageSize,
    hasMore: rows.length > pageSize,
  };
}
export async function getTaskTemplate(
  projectId: string,
  name: string,
  who: Actor,
) {
  const [row] = await db
    .select({
      projectId: taskTemplateTable.projectId,
      name: taskTemplateTable.name,
      title: taskTemplateTable.title,
      description: taskTemplateTable.description,
      defaults: taskTemplateTable.defaults,
    })
    .from(taskTemplateTable)
    .innerJoin(projectTable, eq(projectTable.id, taskTemplateTable.projectId))
    .where(
      and(
        eq(projectTable.id, projectId),
        eq(taskTemplateTable.name, name),
        readableProjects(who),
      ),
    );
  if (!row) throw new HTTPException(404, { message: "Template not found" });
  return row;
}

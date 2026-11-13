import { and, asc, eq } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import db from "../../../database";
import { columnTable, projectTable } from "../../../database/schema";
import { columnExtTable } from "../../../database/schema-parity";
import { publishEvent } from "../../../events";
import { type Category, defaultCategory } from "../categories";
import { backfillLifecycle } from "./sync-lifecycle";

export async function getCategories(projectId?: string) {
  const rows = await db
    .select({
      id: columnTable.id,
      projectId: columnTable.projectId,
      name: columnTable.name,
      slug: columnTable.slug,
      isFinal: columnTable.isFinal,
      category: columnExtTable.category,
    })
    .from(columnTable)
    .leftJoin(columnExtTable, eq(columnTable.id, columnExtTable.columnId))
    .where(projectId ? eq(columnTable.projectId, projectId) : undefined)
    .orderBy(asc(columnTable.position));
  return rows.map((row) => ({
    ...row,
    category: row.category ?? defaultCategory(row.slug, row.isFinal),
  }));
}

export async function seedCategories() {
  const rows = await getCategories();
  for (let offset = 0; offset < rows.length; offset += 500) {
    await db
      .insert(columnExtTable)
      .values(
        rows
          .slice(offset, offset + 500)
          .map((row) => ({ columnId: row.id, category: row.category })),
      )
      .onConflictDoNothing();
  }
}

export async function updateCategory(
  projectId: string,
  columnId: string,
  category: Category,
) {
  const workspaceId = await db.transaction(async (tx) => {
    const [column] = await tx
      .select()
      .from(columnTable)
      .where(
        and(eq(columnTable.id, columnId), eq(columnTable.projectId, projectId)),
      )
      .for("update");
    if (!column) throw new HTTPException(404, { message: "Column not found" });
    await tx
      .insert(columnExtTable)
      .values({ columnId, category })
      .onConflictDoUpdate({
        target: columnExtTable.columnId,
        set: { category },
      });
    const [project] = await tx
      .select({ workspaceId: projectTable.workspaceId })
      .from(projectTable)
      .where(eq(projectTable.id, projectId));
    if (!project)
      throw new HTTPException(404, { message: "Project not found" });
    return project.workspaceId;
  });
  await backfillLifecycle(projectId);
  await publishEvent("parity.workspace_updated", {
    type: "PROJECT_PLAN_UPDATED",
    workspaceId,
    projectId,
  });
  return { columnId, category };
}

import { and, desc, eq, exists, inArray, sql } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import db from "../../database";
import { projectTable, userTable } from "../../database/schema";
import {
  initiativeTable,
  projectExtTable,
  statusUpdateTable,
} from "../../database/schema-parity";
import { publishEvent } from "../../events";
import {
  findInitiative,
  lockProject,
  readableProjects,
  type Actor,
} from "./access";
import type { ParentType, UpdateInput } from "./schema";

const selection = {
  id: statusUpdateTable.id,
  parentType: statusUpdateTable.parentType,
  parentId: statusUpdateTable.parentId,
  authorId: statusUpdateTable.authorId,
  authorName: userTable.name,
  health: statusUpdateTable.health,
  body: statusUpdateTable.body,
  createdAt: statusUpdateTable.createdAt,
};

export async function latestUpdates(parentType: ParentType, ids: string[]) {
  if (!ids.length) return [];
  return db
    .selectDistinctOn([statusUpdateTable.parentId], selection)
    .from(statusUpdateTable)
    .leftJoin(userTable, eq(userTable.id, statusUpdateTable.authorId))
    .where(
      and(
        eq(statusUpdateTable.parentType, parentType),
        inArray(statusUpdateTable.parentId, ids),
      ),
    )
    .orderBy(
      statusUpdateTable.parentId,
      desc(statusUpdateTable.createdAt),
      desc(statusUpdateTable.id),
    );
}

export async function listStatusUpdates(
  parentType: ParentType,
  parentId: string,
  who: Actor,
  page: number,
  pageSize: number,
) {
  // Re-resolve the parent; an orphan or a concurrently moved project is not a feed.
  await db.transaction(async (tx) => {
    if (parentType === "project") await lockProject(tx, parentId, who);
    else await findInitiative(parentId, who, tx);
  });
  const rows = await db
    .select(selection)
    .from(statusUpdateTable)
    .leftJoin(userTable, eq(userTable.id, statusUpdateTable.authorId))
    .where(
      and(
        eq(statusUpdateTable.parentType, parentType),
        eq(statusUpdateTable.parentId, parentId),
        parentType === "project"
          ? exists(
              db
                .select({ id: projectTable.id })
                .from(projectTable)
                .where(
                  and(eq(projectTable.id, parentId), readableProjects(who)),
                ),
            )
          : exists(
              db
                .select({ id: initiativeTable.id })
                .from(initiativeTable)
                .where(
                  and(
                    eq(initiativeTable.id, parentId),
                    eq(initiativeTable.workspaceId, who.workspaceId),
                  ),
                ),
            ),
      ),
    )
    .orderBy(desc(statusUpdateTable.createdAt), desc(statusUpdateTable.id))
    .limit(pageSize + 1)
    .offset((page - 1) * pageSize);
  return {
    items: rows.slice(0, pageSize),
    hasMore: rows.length > pageSize,
    page,
    pageSize,
  };
}

export async function createStatusUpdate(
  parentType: ParentType,
  parentId: string,
  who: Actor,
  input: UpdateInput,
) {
  const update = await db.transaction(async (tx) => {
    if (parentType === "project") {
      await lockProject(tx, parentId, who);
      await tx
        .insert(projectExtTable)
        .values({ projectId: parentId, health: input.health })
        .onConflictDoUpdate({
          target: projectExtTable.projectId,
          set: { health: input.health },
        });
    } else {
      const initiative = await findInitiative(parentId, who, tx, true);
      if (initiative.archivedAt)
        throw new HTTPException(409, {
          message: "Restore the initiative before posting an update",
        });
      await tx
        .update(initiativeTable)
        .set({ health: input.health })
        .where(eq(initiativeTable.id, parentId));
    }
    const [created] = await tx
      .insert(statusUpdateTable)
      .values({
        parentType,
        parentId,
        authorId: who.userId,
        ...input,
        createdAt: sql`clock_timestamp()`,
      })
      .returning();
    if (!created)
      throw new HTTPException(500, { message: "Could not create update" });
    const [author] = await tx
      .select({ name: userTable.name })
      .from(userTable)
      .where(eq(userTable.id, who.userId));
    return { ...created, authorName: author?.name ?? null };
  });
  await publishEvent("parity.workspace_updated", {
    type:
      parentType === "project" ? "PROJECT_PLAN_UPDATED" : "INITIATIVE_UPDATED",
    workspaceId: who.workspaceId,
    ...(parentType === "project" ? { projectId: parentId } : {}),
  });
  return update;
}

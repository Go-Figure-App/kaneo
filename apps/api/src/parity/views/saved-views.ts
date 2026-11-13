import { and, asc, eq, sql } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import db from "../../database";
import { favoriteTable, savedViewTable } from "../../database/schema-parity";
import { publishEvent } from "../../events";
import { lockCycleWorkspace } from "../cycles/access";
import { lockProject, type Actor } from "../planning/access";
import { findSavedView, visibleViews } from "./access";
import { validateViewFilterAccess } from "./filter-access";
import type { SavedViewInput } from "./schema";

export async function announceViews(who: Actor) {
  await publishEvent("parity.workspace_updated", {
    type: "VIEW_UPDATED",
    workspaceId: who.workspaceId,
  });
}
export async function listSavedViews(
  who: Actor,
  page: number,
  pageSize: number,
  manageShared: boolean,
  canShare: boolean,
) {
  const rows = await db
    .select()
    .from(savedViewTable)
    .where(visibleViews(who))
    .orderBy(asc(savedViewTable.name), asc(savedViewTable.id))
    .limit(pageSize + 1)
    .offset((page - 1) * pageSize);
  return {
    items: rows.slice(0, pageSize).map((view) => ({
      ...view,
      canEdit: view.shared
        ? canShare && (view.ownerId === who.userId || manageShared)
        : view.ownerId === who.userId,
    })),
    page,
    pageSize,
    hasMore: rows.length > pageSize,
  };
}
export async function getSavedView(
  id: string,
  who: Actor,
  manageShared: boolean,
  canShare: boolean,
) {
  const view = await findSavedView(id, who);
  return {
    ...view,
    canEdit: view.shared
      ? canShare && (view.ownerId === who.userId || manageShared)
      : view.ownerId === who.userId,
  };
}
export async function saveView(
  who: Actor,
  input: SavedViewInput,
  canShare: boolean,
  manageShared: boolean,
  id?: string,
) {
  const result = await db.transaction(async (tx) => {
    await lockCycleWorkspace(tx, who.workspaceId);
    const previous = id ? await findSavedView(id, who, tx, true) : undefined;
    if (
      previous &&
      previous.ownerId !== who.userId &&
      !(previous.shared && manageShared)
    )
      throw new HTTPException(403, {
        message:
          "Only the owner or a workspace administrator can edit this view",
      });
    if ((input.shared || previous?.shared) && !canShare)
      throw new HTTPException(403, {
        message: "Project update permission is required for shared views",
      });
    if (input.projectId) await lockProject(tx, input.projectId, who);
    await validateViewFilterAccess(tx, who, input.filters);
    if (previous) {
      // An administrator cannot turn another member's shared view into a
      // private view owned by that member without their involvement.
      if (!input.shared && previous.ownerId !== who.userId)
        throw new HTTPException(403, {
          message: "Only the owner can make a view private",
        });
      const [row] = await tx
        .update(savedViewTable)
        .set(input)
        .where(eq(savedViewTable.id, previous.id))
        .returning();
      return row!;
    }
    const [count] = await tx
      .select({ value: sql<number>`count(*)::int` })
      .from(savedViewTable)
      .where(
        and(
          eq(savedViewTable.workspaceId, who.workspaceId),
          eq(savedViewTable.ownerId, who.userId),
        ),
      );
    if ((count?.value ?? 0) >= 1000)
      throw new HTTPException(400, {
        message: "Remove an unused view before creating another",
      });
    const [row] = await tx
      .insert(savedViewTable)
      .values({ ...input, workspaceId: who.workspaceId, ownerId: who.userId })
      .returning();
    return row!;
  });
  await announceViews(who);
  return { ...result, canEdit: true };
}
export async function deleteSavedView(
  id: string,
  who: Actor,
  canShare: boolean,
  manageShared: boolean,
) {
  await db.transaction(async (tx) => {
    await lockCycleWorkspace(tx, who.workspaceId);
    const view = await findSavedView(id, who, tx, true);
    if (view.ownerId !== who.userId && !(view.shared && manageShared))
      throw new HTTPException(403, {
        message:
          "Only the owner or a workspace administrator can delete this view",
      });
    if (view.shared && !canShare)
      throw new HTTPException(403, {
        message: "Project update permission is required for shared views",
      });
    await tx
      .delete(favoriteTable)
      .where(
        and(eq(favoriteTable.kind, "view"), eq(favoriteTable.targetId, id)),
      );
    await tx.delete(savedViewTable).where(eq(savedViewTable.id, id));
  });
  await announceViews(who);
  return { id };
}

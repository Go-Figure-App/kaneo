import { and, eq, not, sql } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import db from "../../database";
import { userTable } from "../../database/schema";
import { favoriteTable } from "../../database/schema-parity";
import type { Actor, Transaction } from "../planning/access";
import {
  favoriteKey,
  favoriteTargetExists,
  listFavorites,
  readableFavoriteTargets,
} from "./favorite-read";
import { announceViews } from "./saved-views";
import { favoriteWorkspace } from "./favorite-workspace";
import type { FavoriteTarget } from "./schema";
async function lockFavorites(tx: Transaction, who: Actor) {
  await tx
    .select({ id: userTable.id })
    .from(userTable)
    .where(eq(userTable.id, who.userId))
    .for("update");
}
const match = (who: Actor, target: FavoriteTarget) =>
  and(
    eq(favoriteTable.userId, who.userId),
    eq(favoriteTable.kind, target.kind),
    eq(favoriteTable.targetId, target.targetId),
  );
export async function addFavorite(who: Actor, target: FavoriteTarget) {
  await db.transaction(async (tx) => {
    await lockFavorites(tx, who);
    if (
      !(await readableFavoriteTargets(who, [target], tx)).has(
        favoriteKey(target),
      )
    )
      throw new HTTPException(404, { message: "Favorite target not found" });
    const [previous] = await tx
      .select()
      .from(favoriteTable)
      .where(match(who, target));
    if (previous) return;
    // Reclaim deleted targets under the same user lock as the capacity check.
    // This avoids editing upstream deletion controllers or pruning on reads.
    await tx
      .delete(favoriteTable)
      .where(
        and(
          eq(favoriteTable.userId, who.userId),
          not(favoriteTargetExists(tx)!),
        ),
      );
    const [count] = await tx
      .select({
        value: sql<number>`count(*)::int`,
        position: sql<number>`coalesce(max(${favoriteTable.position}), -1)::int`,
      })
      .from(favoriteTable)
      .where(eq(favoriteTable.userId, who.userId));
    if ((count?.value ?? 0) >= 1000)
      throw new HTTPException(400, {
        message: "Remove a favorite before adding another",
      });
    await tx.insert(favoriteTable).values({
      ...target,
      userId: who.userId,
      position: (count?.position ?? -1) + 1,
    });
  });
  await announceViews(who);
  return target;
}
export async function removeFavorite(who: Actor, target: FavoriteTarget) {
  // Removing one's own bookmark stays possible even after its target is gone.
  await db.transaction(async (tx) => {
    await lockFavorites(tx, who);
    const workspaceId = await favoriteWorkspace(tx, target);
    if (workspaceId && workspaceId !== who.workspaceId)
      throw new HTTPException(404, { message: "Favorite target not found" });
    await tx.delete(favoriteTable).where(match(who, target));
  });
  await announceViews(who);
  return target;
}
export async function reorderFavorites(who: Actor, targets: FavoriteTarget[]) {
  if (new Set(targets.map(favoriteKey)).size !== targets.length)
    throw new HTTPException(400, {
      message: "Favorite order contains duplicates",
    });
  await db.transaction(async (tx) => {
    await lockFavorites(tx, who);
    const current = await listFavorites(who, tx);
    const keys = new Set(current.map(favoriteKey));
    if (
      current.length !== targets.length ||
      targets.some((target) => !keys.has(favoriteKey(target)))
    )
      throw new HTTPException(409, {
        message: "Favorites changed; refresh before reordering",
      });
    // Reuse this workspace's position slots so other workspaces keep their order.
    const positions = current.map((row) => row.position).sort((a, b) => a - b);
    for (const [index, target] of targets.entries())
      await tx
        .update(favoriteTable)
        .set({ position: positions[index]! })
        .where(match(who, target));
  });
  await announceViews(who);
  return { items: await listFavorites(who) };
}

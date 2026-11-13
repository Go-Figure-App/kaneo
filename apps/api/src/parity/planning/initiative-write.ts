import { and, eq, isNull, sql } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import db from "../../database";
import { workspaceTable } from "../../database/schema";
import {
  initiativeProjectTable,
  initiativeTable,
  statusUpdateTable,
} from "../../database/schema-parity";
import { publishEvent } from "../../events";
import { assertAssignableUser } from "../../utils/assert-assignable-user";
import {
  findInitiative,
  lockProject,
  type Actor,
  type Transaction,
} from "./access";
import { getInitiative } from "./initiative-read";
import type { InitiativeInput, InitiativePatch } from "./schema";

async function lockWorkspace(tx: Transaction, who: Actor) {
  const [workspace] = await tx
    .select({ id: workspaceTable.id })
    .from(workspaceTable)
    .where(
      and(
        eq(workspaceTable.id, who.workspaceId),
        isNull(workspaceTable.archivedAt),
      ),
    )
    .for("update");
  if (!workspace)
    throw new HTTPException(404, { message: "Workspace not found" });
}
async function announce(who: Actor) {
  await publishEvent("parity.workspace_updated", {
    type: "INITIATIVE_UPDATED",
    workspaceId: who.workspaceId,
  });
}

export async function createInitiative(who: Actor, input: InitiativeInput) {
  const id = await db.transaction(async (tx) => {
    await lockWorkspace(tx, who);
    if (input.ownerId)
      await assertAssignableUser(input.ownerId, who.workspaceId, [], tx);
    const [last] = await tx
      .select({
        value: sql<number>`coalesce(max(${initiativeTable.position}), -1)::int`,
      })
      .from(initiativeTable)
      .where(eq(initiativeTable.workspaceId, who.workspaceId));
    const [created] = await tx
      .insert(initiativeTable)
      .values({
        ...input,
        workspaceId: who.workspaceId,
        position: (last?.value ?? -1) + 1,
      })
      .returning({ id: initiativeTable.id });
    if (!created)
      throw new HTTPException(500, { message: "Could not create initiative" });
    return created.id;
  });
  await announce(who);
  return getInitiative(id, who);
}

export async function updateInitiative(
  id: string,
  who: Actor,
  input: InitiativePatch,
) {
  await db.transaction(async (tx) => {
    await findInitiative(id, who, tx, true);
    if (input.ownerId)
      await assertAssignableUser(input.ownerId, who.workspaceId, [], tx);
    const { archived, ...properties } = input;
    if (Object.values(input).every((value) => value === undefined)) return;
    await tx
      .update(initiativeTable)
      .set({
        ...properties,
        ...(archived === undefined
          ? {}
          : { archivedAt: archived ? new Date() : null }),
      })
      .where(eq(initiativeTable.id, id));
  });
  await announce(who);
  return getInitiative(id, who);
}

export async function deleteInitiative(id: string, who: Actor) {
  await db.transaction(async (tx) => {
    await findInitiative(id, who, tx, true);
    await tx
      .delete(statusUpdateTable)
      .where(
        and(
          eq(statusUpdateTable.parentType, "initiative"),
          eq(statusUpdateTable.parentId, id),
        ),
      );
    await tx.delete(initiativeTable).where(eq(initiativeTable.id, id));
  });
  await announce(who);
  return { id };
}

export async function linkProject(
  id: string,
  projectId: string,
  who: Actor,
  linked: boolean,
  position?: number,
) {
  await db.transaction(async (tx) => {
    // Project moves also hold this lock; an initiative cannot cross workspaces.
    await lockProject(tx, projectId, who);
    const initiative = await findInitiative(id, who, tx, true);
    if (initiative.archivedAt)
      throw new HTTPException(409, {
        message: "Restore the initiative before changing projects",
      });
    if (linked) {
      const [last] = await tx
        .select({
          value: sql<number>`coalesce(max(${initiativeProjectTable.position}), -1)::int`,
        })
        .from(initiativeProjectTable)
        .where(eq(initiativeProjectTable.initiativeId, id));
      const values = {
        initiativeId: id,
        projectId,
        position: position ?? (last?.value ?? -1) + 1,
      };
      if (position === undefined)
        await tx
          .insert(initiativeProjectTable)
          .values(values)
          .onConflictDoNothing();
      else
        await tx
          .insert(initiativeProjectTable)
          .values(values)
          .onConflictDoUpdate({
            target: [
              initiativeProjectTable.initiativeId,
              initiativeProjectTable.projectId,
            ],
            set: { position },
          });
    } else
      await tx
        .delete(initiativeProjectTable)
        .where(
          and(
            eq(initiativeProjectTable.initiativeId, id),
            eq(initiativeProjectTable.projectId, projectId),
          ),
        );
  });
  await announce(who);
  return { id, projectId };
}

export async function reorderInitiatives(who: Actor, ids: string[]) {
  await db.transaction(async (tx) => {
    await lockWorkspace(tx, who);
    const current = await tx
      .select({ id: initiativeTable.id })
      .from(initiativeTable)
      .where(
        and(
          eq(initiativeTable.workspaceId, who.workspaceId),
          isNull(initiativeTable.archivedAt),
        ),
      )
      .orderBy(initiativeTable.id)
      .for("update");
    const requested = new Set(ids);
    if (
      ids.length !== requested.size ||
      current.length !== ids.length ||
      current.some((row) => !requested.has(row.id))
    )
      throw new HTTPException(409, {
        message: "The initiative list changed; refresh before reordering",
      });
    for (const [position, id] of ids.entries())
      await tx
        .update(initiativeTable)
        .set({ position })
        .where(eq(initiativeTable.id, id));
  });
  await announce(who);
  return { ids };
}

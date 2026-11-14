import { statusUpdateTable } from "../../database/schema-parity";
import type { Transaction } from "../planning/access";
import type { ImportIdentity, Update } from "./types";
import { health, importId, instant } from "./values";

export async function writeUpdates(
  tx: Transaction,
  runId: string,
  parentType: "project" | "initiative",
  parentId: string,
  updates: Update[],
  identify: ImportIdentity,
) {
  for (const update of updates) {
    const createdAt = instant(update.createdAt);
    if (!createdAt)
      throw new Error("Linear returned an invalid update timestamp.");
    await tx
      .insert(statusUpdateTable)
      .values({
        id: importId(runId, `${parentType}-update`, update.id),
        parentType,
        parentId,
        authorId: identify(update.user),
        health: health(update.health),
        body: update.body,
        createdAt,
      })
      .onConflictDoNothing();
  }
}

import { initiativeTable } from "../../database/schema-parity";
import type { Transaction } from "../planning/access";
import type { ImportIdentity, ProjectPlanning } from "./types";
import { dateOnly, health, importId, instant, requiredInstant } from "./values";
import { writeUpdates } from "./write-updates";

export async function writeImportInitiatives(
  tx: Transaction,
  input: {
    workspaceId: string;
    runId: string;
    data: ProjectPlanning;
    includeEmptyInitiatives: boolean;
    identify: ImportIdentity;
  },
) {
  const { workspaceId, runId, data, identify } = input;
  const warnings: string[] = [];
  const links = data.workspace.initiativeProjects;
  const linked = new Set(
    links
      .filter((link) => link.project.id === data.project?.id)
      .map((link) => link.initiative.id),
  );
  const anyLinks = new Set(links.map((link) => link.initiative.id));
  const initiatives = data.workspace.initiatives.filter(
    (row) =>
      linked.has(row.id) ||
      (input.includeEmptyInitiatives && !anyLinks.has(row.id)),
  );
  const initiativeIds = new Map<string, string>();
  for (const initiative of initiatives) {
    const id = importId(runId, "initiative", initiative.id);
    initiativeIds.set(initiative.id, id);
    const status = initiative.status.toLowerCase();
    if (
      !["proposed", "planned", "active", "completed", "canceled"].includes(
        status,
      )
    )
      throw new Error("Linear returned an unsupported initiative status.");
    const canceled = status === "canceled";
    await tx
      .insert(initiativeTable)
      .values({
        id,
        workspaceId,
        name: initiative.name,
        description: [initiative.description, initiative.content]
          .filter(Boolean)
          .join("\n\n"),
        status:
          status === "active"
            ? "active"
            : status === "completed"
              ? "completed"
              : "planned",
        health: health(initiative.health),
        ownerId: identify(initiative.owner),
        targetDate: dateOnly(initiative.targetDate),
        icon: initiative.icon,
        color: initiative.color,
        archivedAt:
          instant(initiative.archivedAt) ?? (canceled ? new Date() : null),
        createdAt: requiredInstant(
          initiative.createdAt,
          "initiative createdAt",
        ),
        updatedAt: requiredInstant(
          initiative.updatedAt,
          "initiative updatedAt",
        ),
      })
      .onConflictDoNothing();
    if (canceled)
      warnings.push(
        "A canceled Linear initiative was imported as archived and planned because this fork has no canceled initiative status.",
      );
    await writeUpdates(
      tx,
      runId,
      "initiative",
      id,
      data.workspace.initiativeUpdates.filter(
        (update) => update.initiative?.id === initiative.id,
      ),
      identify,
    );
  }
  return { initiativeIds, warnings };
}

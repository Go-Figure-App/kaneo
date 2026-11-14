import { initiativeProjectTable } from "../../database/schema-parity";
import type { Transaction } from "../planning/access";
import type { ProjectPlanning } from "./types";

export async function writeInitiativeProjects(
  tx: Transaction,
  data: ProjectPlanning,
  projectId: string,
  initiativeIds: ReadonlyMap<string, string>,
) {
  const positions = new Map<string, number>();
  // Sort within the complete source initiative, not this project's links.
  const links = [...data.workspace.initiativeProjects].sort((a, b) =>
    a.sortOrder === b.sortOrder
      ? a.id.localeCompare(b.id)
      : a.sortOrder < b.sortOrder
        ? -1
        : 1,
  );
  for (const link of links) {
    const position = positions.get(link.initiative.id) ?? 0;
    positions.set(link.initiative.id, position + 1);
    const initiativeId = initiativeIds.get(link.initiative.id);
    if (initiativeId && link.project.id === data.project?.id)
      await tx
        .insert(initiativeProjectTable)
        .values({ initiativeId, projectId, position });
  }
}

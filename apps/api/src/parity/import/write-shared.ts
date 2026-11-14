import type { Transaction } from "../planning/access";
import type { ImportIdentity, ProjectPlanning } from "./types";
import { writeImportSettings } from "./write-settings";
import { writeImportCycles } from "./write-cycles";
import { writeImportInitiatives } from "./write-initiatives";

export async function writeSharedPlanning(
  tx: Transaction,
  input: {
    runId: string;
    workspaceId: string;
    data: ProjectPlanning;
    includeEmptyInitiatives: boolean;
    identify: ImportIdentity;
  },
) {
  // Settings hold the workspace row lock while shared cycle numbers are allocated.
  const warnings = await writeImportSettings(tx, input.workspaceId, input.data);
  const cycles = await writeImportCycles(
    tx,
    input.workspaceId,
    input.runId,
    input.data,
  );
  const initiatives = await writeImportInitiatives(tx, input);
  return {
    cycleIds: cycles.cycleIds,
    initiativeIds: initiatives.initiativeIds,
    warnings: [...warnings, ...cycles.warnings, ...initiatives.warnings],
  };
}

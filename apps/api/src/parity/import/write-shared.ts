import type { Transaction } from "../planning/access";
import type { ImportIdentity, ProjectPlanning } from "./types";
import { writeImportSettings } from "./write-settings";
import { writeImportCycles } from "./write-cycles";
import { writeImportInitiatives } from "./write-initiatives";
import { lockCycleWorkspace } from "../cycles/access";

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
  // Match the scheduler's lock order before settings or cycle-number writes.
  await lockCycleWorkspace(tx, input.workspaceId);
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

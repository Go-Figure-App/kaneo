import type { LinearGraphQLOptions } from "@tracing/importers/linear";
import { connectPlanningSource } from "./source";
import { finishPlanningImport, type PlanningFinishInput } from "./finish";
import {
  writePlanningProject,
  type CommittedProject,
  type PlanningWriteInput,
} from "./write-project";

export async function connectPlanningLinear(options: LinearGraphQLOptions) {
  const planning = await connectPlanningSource(options);
  const committed: CommittedProject[] = [];
  return {
    source: planning.source,
    async writeProject(input: PlanningWriteInput) {
      const data = planning.metadata.get(input.project);
      if (!data || data.sourceId !== input.sourceProjectId)
        throw new Error(
          "The Linear planning metadata does not match this import.",
        );
      const selected = new Set(input.selectedProjectIds);
      const includeEmpty = planning
        .availableIds()
        .every((id) => selected.has(id));
      const { committed: entry, ...written } = await writePlanningProject(
        input,
        data,
        includeEmpty,
      );
      committed.push(entry);
      planning.metadata.delete(input.project);
      return written;
    },
    finish: (input: PlanningFinishInput) =>
      finishPlanningImport(committed, input),
  };
}

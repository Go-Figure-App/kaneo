import type { ImportSourceDefinition } from "@/components/import/import-source-definitions";
import type { ImportRun } from "@/fetchers/import/get-import-run";

export function planningImportSource(
  source: ImportSourceDefinition,
  enabled: boolean,
): ImportSourceDefinition {
  return enabled && source.id === "linear"
    ? {
        ...source,
        unit: "project",
        descriptionKey: "parity:import.description",
        introKey: "parity:import.intro",
      }
    : source;
}
export function isPlanningImport(run: ImportRun) {
  return (
    run.source === "linear" &&
    run.projects.some((project) => /^(project|team):/.test(project.sourceId))
  );
}

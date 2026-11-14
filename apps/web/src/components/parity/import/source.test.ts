import { expect, it } from "vite-plus/test";
import { getImportSource } from "@/components/import/import-source-definitions";
import { isPlanningImport, planningImportSource } from "./source";

it("changes only enabled Linear discovery and leaves the upstream definition intact", () => {
  const linear = getImportSource("linear");
  expect(planningImportSource(linear, true)).toMatchObject({
    unit: "project",
    introKey: "parity:import.intro",
  });
  expect(linear.unit).toBe("team");
  expect(planningImportSource(linear, false)).toBe(linear);
  expect(planningImportSource(getImportSource("jira"), true).unit).toBe(
    "project",
  );
});
it("uses persisted source IDs to label past imports independently of feature flags", () => {
  const run = {
    source: "linear",
    projects: [{ sourceId: "project:uuid" }],
  } as Parameters<typeof isPlanningImport>[0];
  expect(isPlanningImport(run)).toBe(true);
  expect(
    isPlanningImport({
      ...run,
      projects: [{ ...run.projects[0]!, sourceId: "team:uuid" }],
    }),
  ).toBe(true);
  expect(
    isPlanningImport({
      ...run,
      projects: [{ ...run.projects[0]!, sourceId: "upstream-team-uuid" }],
    }),
  ).toBe(false);
});

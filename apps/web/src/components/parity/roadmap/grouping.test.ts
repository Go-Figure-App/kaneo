import { expect, it } from "vite-plus/test";
import { emptyFilters, filteredProjects, roadmapGroups } from "./grouping";
import { roadmapProject } from "./test-fixtures";

it("supports multiple initiative memberships and puts unlinked work last", () => {
  const projects = [
    roadmapProject({ id: "multi", initiativeIds: ["a", "b"] }),
    roadmapProject({ id: "alone" }),
  ];
  const initiatives = [
    { id: "a", name: "First", color: null, position: 0 },
    { id: "b", name: "Second", color: null, position: 1 },
  ];
  expect(
    roadmapGroups(projects, initiatives).map((group) => [
      group.id,
      group.projects.map((project) => project.id),
    ]),
  ).toEqual([
    ["a", ["multi"]],
    ["b", ["multi"]],
    ["none", ["alone"]],
  ]);
  expect(
    roadmapGroups(projects, initiatives, "b").map((group) => group.id),
  ).toEqual(["b"]);
});
it("combines status, lead, health and initiative filters without losing unassigned work", () => {
  const matching = roadmapProject({
    id: "match",
    leadId: "lead",
    initiativeIds: ["a"],
    health: "at_risk",
  });
  const projects = [matching, roadmapProject({ id: "other" })];
  expect(
    filteredProjects(projects, {
      status: "started",
      lead: "lead",
      initiative: "a",
      health: "at_risk",
    }),
  ).toEqual([matching]);
  expect(
    filteredProjects(projects, {
      ...emptyFilters,
      lead: "none",
      initiative: "none",
    }).map((project) => project.id),
  ).toEqual(["other"]);
});

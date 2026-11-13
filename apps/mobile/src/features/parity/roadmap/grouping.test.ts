import { expect, it } from "vite-plus/test";
import type { RoadmapProject } from "./api";
import { nextMilestone, roadmapSections } from "./grouping";

const project: RoadmapProject = {
  id: "project",
  workspaceId: "workspace",
  name: "Launch",
  slug: "PLAN",
  icon: null,
  status: "started",
  health: "on_track",
  priority: "medium",
  leadId: null,
  leadName: null,
  leadImage: null,
  startDate: null,
  targetDate: null,
  initiativeIds: [],
  milestones: [],
  progress: {
    completed: 0,
    total: 0,
    percent: 0,
    completedPoints: null,
    totalPoints: null,
    pointsPercent: null,
  },
};
it("shows projects in each initiative and puts unlinked projects in the last section", () => {
  const sections = roadmapSections(
    {
      projects: [
        { ...project, initiativeIds: ["one", "two"] },
        { ...project, id: "unlinked" },
      ],
      initiatives: [
        { id: "one", name: "First", position: 0, color: null },
        { id: "two", name: "Second", position: 1, color: null },
      ],
    },
    "No initiative",
  );
  expect(
    sections.map((section) => [
      section.title,
      section.data.map((row) => row.id),
    ]),
  ).toEqual([
    ["First", ["project"]],
    ["Second", ["project"]],
    ["No initiative", ["unlinked"]],
  ]);
});
it("chooses the next incomplete dated milestone before unscheduled ones without mutating the response", () => {
  const milestone = {
    id: "later",
    projectId: project.id,
    name: "Beta",
    position: 1,
    targetDate: "2026-12-01",
    progress: project.progress,
  };
  const milestones = [
    milestone,
    { ...milestone, id: "undated", targetDate: null, position: 0 },
    {
      ...milestone,
      id: "done",
      targetDate: "2026-11-01",
      progress: { ...project.progress, percent: 100 },
    },
    { ...milestone, id: "next", targetDate: "2026-11-15" },
  ];
  expect(nextMilestone({ milestones })?.id).toBe("next");
  expect(milestones[0].id).toBe("later");
  expect(nextMilestone({ milestones: [] })).toBeUndefined();
});

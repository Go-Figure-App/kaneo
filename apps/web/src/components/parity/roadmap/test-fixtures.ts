import type { RoadmapProject } from "@/fetchers/parity/roadmap";

export function roadmapProject(
  overrides: Partial<RoadmapProject> = {},
): RoadmapProject {
  return {
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
    startDate: "2026-11-10",
    targetDate: "2026-11-20",
    initiativeIds: [],
    milestones: [],
    progress: {
      completed: 1,
      total: 2,
      percent: 50,
      completedPoints: null,
      totalPoints: null,
      pointsPercent: null,
    },
    ...overrides,
  };
}

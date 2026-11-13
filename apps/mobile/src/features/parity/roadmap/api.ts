import { request } from "@/lib/api/client";
import type { Milestone, ProjectSummary } from "../planning/types";

export type RoadmapProject = Omit<
  ProjectSummary,
  "description" | "latestUpdate"
> & {
  leadImage: string | null;
  initiativeIds: string[];
  milestones: Omit<Milestone, "description">[];
};
export type Roadmap = {
  projects: RoadmapProject[];
  initiatives: {
    id: string;
    name: string;
    color: string | null;
    position: number;
  }[];
};
export function getRoadmap(workspaceId: string) {
  return request<Roadmap>(
    `api/parity/roadmap/${encodeURIComponent(workspaceId)}`,
  );
}

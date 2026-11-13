import { client } from "@kaneo/libs";
import { HttpError } from "@/lib/http-error";

export async function getRoadmap(workspaceId: string) {
  const response = await client.parity.roadmap[":workspaceId"].$get({
    param: { workspaceId },
  });
  if (!response.ok) throw await HttpError.fromResponse(response);
  return response.json();
}
export type Roadmap = Awaited<ReturnType<typeof getRoadmap>>;
export type RoadmapProject = Roadmap["projects"][number];
export type RoadmapMilestone = RoadmapProject["milestones"][number];

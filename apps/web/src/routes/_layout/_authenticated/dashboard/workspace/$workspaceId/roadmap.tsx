import { createFileRoute } from "@tanstack/react-router";
import { RoadmapPage } from "@/components/parity/roadmap/roadmap-page";

export const Route = createFileRoute(
  "/_layout/_authenticated/dashboard/workspace/$workspaceId/roadmap",
)({ component: RoadmapRoute });
function RoadmapRoute() {
  const { workspaceId } = Route.useParams();
  return <RoadmapPage key={workspaceId} workspaceId={workspaceId} />;
}

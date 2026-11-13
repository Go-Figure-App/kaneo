import { createFileRoute } from "@tanstack/react-router";
import { ProjectOverview } from "@/components/parity/planning/project-overview";

export const Route = createFileRoute(
  "/_layout/_authenticated/dashboard/workspace/$workspaceId/project/$projectId/overview",
)({ component: OverviewRoute });
function OverviewRoute() {
  const { workspaceId, projectId } = Route.useParams();
  return (
    <ProjectOverview
      key={projectId}
      workspaceId={workspaceId}
      projectId={projectId}
    />
  );
}

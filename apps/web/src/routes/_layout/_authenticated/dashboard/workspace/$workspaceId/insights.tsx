import { createFileRoute } from "@tanstack/react-router";
import { InsightsPage } from "@/components/parity/insights/insights-page";
export const Route = createFileRoute(
  "/_layout/_authenticated/dashboard/workspace/$workspaceId/insights",
)({ component: InsightsRoute });
function InsightsRoute() {
  const { workspaceId } = Route.useParams();
  return <InsightsPage key={workspaceId} workspaceId={workspaceId} />;
}

import { createFileRoute } from "@tanstack/react-router";
import { AllIssuesPage } from "@/components/parity/views/all-issues-page";
export const Route = createFileRoute(
  "/_layout/_authenticated/dashboard/workspace/$workspaceId/issues",
)({ component: Page });
function Page() {
  const { workspaceId } = Route.useParams();
  return <AllIssuesPage key={workspaceId} workspaceId={workspaceId} />;
}

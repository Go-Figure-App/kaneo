import { createFileRoute } from "@tanstack/react-router";
import { ViewsPage } from "@/components/parity/views/views-page";
export const Route = createFileRoute(
  "/_layout/_authenticated/dashboard/workspace/$workspaceId/views/",
)({ component: Page });
function Page() {
  const { workspaceId } = Route.useParams();
  return <ViewsPage key={workspaceId} workspaceId={workspaceId} />;
}

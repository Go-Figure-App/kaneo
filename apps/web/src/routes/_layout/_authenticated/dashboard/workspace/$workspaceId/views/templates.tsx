import { createFileRoute } from "@tanstack/react-router";
import { TemplatesPage } from "@/components/parity/views/templates-page";
export const Route = createFileRoute(
  "/_layout/_authenticated/dashboard/workspace/$workspaceId/views/templates",
)({ component: Page });
function Page() {
  const { workspaceId } = Route.useParams();
  return <TemplatesPage key={workspaceId} workspaceId={workspaceId} />;
}

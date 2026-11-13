import { createFileRoute } from "@tanstack/react-router";
import { InitiativesPage } from "@/components/parity/planning/initiatives-page";

export const Route = createFileRoute(
  "/_layout/_authenticated/dashboard/workspace/$workspaceId/initiatives/",
)({ component: InitiativesRoute });
function InitiativesRoute() {
  const { workspaceId } = Route.useParams();
  return <InitiativesPage key={workspaceId} workspaceId={workspaceId} />;
}

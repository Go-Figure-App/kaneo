import { createFileRoute } from "@tanstack/react-router";
import { InitiativeDetail } from "@/components/parity/planning/initiative-detail";

export const Route = createFileRoute(
  "/_layout/_authenticated/dashboard/workspace/$workspaceId/initiatives/$initiativeId",
)({ component: InitiativeRoute });
function InitiativeRoute() {
  const { workspaceId, initiativeId } = Route.useParams();
  return (
    <InitiativeDetail
      key={initiativeId}
      workspaceId={workspaceId}
      initiativeId={initiativeId}
    />
  );
}

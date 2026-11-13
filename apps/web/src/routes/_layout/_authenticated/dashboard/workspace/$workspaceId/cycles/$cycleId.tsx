import { createFileRoute } from "@tanstack/react-router";
import { CyclesPage } from "@/components/parity/cycles/cycles-page";

export const Route = createFileRoute(
  "/_layout/_authenticated/dashboard/workspace/$workspaceId/cycles/$cycleId",
)({ component: CycleRoute });
function CycleRoute() {
  const { workspaceId, cycleId } = Route.useParams();
  return (
    <CyclesPage key={cycleId} workspaceId={workspaceId} cycleId={cycleId} />
  );
}

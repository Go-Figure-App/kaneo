import { createFileRoute } from "@tanstack/react-router";
import { CyclesPage } from "@/components/parity/cycles/cycles-page";
import type { CyclePhase } from "@/fetchers/parity/cycles";

export const Route = createFileRoute(
  "/_layout/_authenticated/dashboard/workspace/$workspaceId/cycles/",
)({
  validateSearch: (search: Record<string, unknown>): { phase: CyclePhase } => ({
    phase:
      search.phase === "upcoming" || search.phase === "past"
        ? search.phase
        : "current",
  }),
  component: CyclesRoute,
});
function CyclesRoute() {
  const { workspaceId } = Route.useParams();
  const { phase } = Route.useSearch();
  return (
    <CyclesPage
      key={`${workspaceId}:${phase}`}
      workspaceId={workspaceId}
      phase={phase}
    />
  );
}

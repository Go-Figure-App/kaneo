import { createFileRoute } from "@tanstack/react-router";
import { TriageInbox } from "@/components/parity/triage/inbox";

export const Route = createFileRoute(
  "/_layout/_authenticated/dashboard/workspace/$workspaceId/triage",
)({ component: TriageRoute });
function TriageRoute() {
  return <TriageInbox workspaceId={Route.useParams().workspaceId} />;
}

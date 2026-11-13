import { createFileRoute } from "@tanstack/react-router";
import { TriageSettings } from "@/components/parity/triage/settings";

export const Route = createFileRoute(
  "/_layout/_authenticated/dashboard/settings/projects/$projectId/triage",
)({ component: TriageSettingsRoute });
function TriageSettingsRoute() {
  return <TriageSettings projectId={Route.useParams().projectId} />;
}

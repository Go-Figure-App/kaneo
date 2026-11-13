import { createFileRoute } from "@tanstack/react-router";
import { IntakeForm } from "@/components/parity/triage/intake-form";

export const Route = createFileRoute("/intake/$token")({
  component: IntakeRoute,
});
function IntakeRoute() {
  return <IntakeForm token={Route.useParams().token} />;
}

import { createFileRoute } from "@tanstack/react-router";
import { ViewDetail } from "@/components/parity/views/view-detail";
export const Route = createFileRoute(
  "/_layout/_authenticated/dashboard/workspace/$workspaceId/views/$viewId",
)({ component: Page });
function Page() {
  const { workspaceId, viewId } = Route.useParams();
  return (
    <ViewDetail
      key={workspaceId + viewId}
      workspaceId={workspaceId}
      viewId={viewId}
    />
  );
}

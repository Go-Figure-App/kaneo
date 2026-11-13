import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { ErrorState, Loading, PageHeader, Screen } from "@/components/screen";
import { Txt } from "@/components/text";
import { userMessage } from "@/lib/api/client";
import { useCycleFocus } from "../cycles/queries";
import { usePlanningEnabled } from "../planning/queries";
import { viewsApi } from "./api";
import { IssuesList } from "./issues-list";
export function ViewScreen({
  workspaceId,
  viewId,
}: {
  workspaceId: string;
  viewId?: string;
}) {
  const { t } = useTranslation(["mobile"]);
  const enabled = usePlanningEnabled("views");
  const query = useQuery({
    queryKey: ["parity", "view", workspaceId, viewId],
    queryFn: () => viewsApi.view(workspaceId, viewId!),
    enabled: enabled && Boolean(workspaceId && viewId),
  });
  useCycleFocus(query.refetch, enabled && Boolean(workspaceId && viewId));
  const view = !enabled || query.isError ? undefined : query.data;
  return (
    <Screen>
      <PageHeader
        title={
          viewId
            ? (view?.name ?? t("mobile:parity.views.title"))
            : t("mobile:parity.views.allIssues")
        }
      />
      {!enabled ? (
        <Txt center>{t("mobile:parity.planning.unavailable")}</Txt>
      ) : viewId && query.isPending ? (
        <Loading />
      ) : viewId && query.error ? (
        <ErrorState
          message={userMessage(query.error)}
          onRetry={query.refetch}
        />
      ) : (
        (!viewId || view) && (
          <IssuesList
            workspaceId={workspaceId}
            view={view}
            refreshing={Boolean(viewId) && query.isRefetching}
            onRefresh={viewId ? () => void query.refetch() : undefined}
          />
        )
      )}
    </Screen>
  );
}

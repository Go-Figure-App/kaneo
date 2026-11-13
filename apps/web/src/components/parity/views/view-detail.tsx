import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import WorkspaceLayout from "@/components/common/workspace-layout";
import PageTitle from "@/components/page-title";
import { Button } from "@/components/ui/button";
import { deleteView, getSavedView } from "@/fetchers/parity/views";
import { usePlanningEnabled } from "../planning/queries";
import { FavoriteButton } from "./favorite-button";
import { IssuesBrowser } from "./issues-browser";
import { refreshViews } from "./queries";
import { SaveViewDialog } from "./save-view-dialog";
export function ViewDetail({
  workspaceId,
  viewId,
}: {
  workspaceId: string;
  viewId: string;
}) {
  const { t } = useTranslation();
  const enabled = usePlanningEnabled("views");
  const client = useQueryClient();
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const [resetVersion, setResetVersion] = useState(0);
  const query = useQuery({
    queryKey: ["parity", "view", workspaceId, viewId],
    queryFn: () => getSavedView(workspaceId, viewId),
    enabled,
  });
  const view = query.isError ? undefined : query.data;
  const remove = useMutation({
    mutationKey: ["parity"],
    mutationFn: () => deleteView(workspaceId, viewId),
    onSuccess: async () => {
      await refreshViews(client);
      await navigate({
        to: "/dashboard/workspace/$workspaceId/views",
        params: { workspaceId },
      });
    },
  });
  const title = enabled
    ? (view?.name ?? t("parity:views.title"))
    : t("parity:views.title");
  return (
    <WorkspaceLayout
      title={title}
      headerActions={
        enabled &&
        view && (
          <div className="flex items-center gap-2">
            <FavoriteButton
              workspaceId={workspaceId}
              kind="view"
              targetId={viewId}
            />
            {view.canEdit && (
              <>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setEditing(true)}
                >
                  {t("parity:views.edit")}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={remove.isPending}
                  onClick={() => {
                    if (window.confirm(t("parity:views.deleteConfirm")))
                      remove.mutate();
                  }}
                >
                  {t("parity:views.delete")}
                </Button>
              </>
            )}
          </div>
        )
      }
    >
      <PageTitle title={title} />
      <div className="h-full overflow-auto p-4 sm:p-6 space-y-4">
        {!enabled ? (
          <p>{t("parity:planning.unavailable")}</p>
        ) : (
          <>
            {query.isPending && (
              <p role="status">{t("parity:planning.loading")}</p>
            )}
            {query.error && (
              <div role="alert">
                {query.error.message}
                <Button variant="ghost" onClick={() => query.refetch()}>
                  {t("parity:planning.retry")}
                </Button>
              </div>
            )}
            {remove.error && <p role="alert">{remove.error.message}</p>}
            {view && (
              <IssuesBrowser
                key={view.id}
                workspaceId={workspaceId}
                view={view}
                resetVersion={resetVersion}
              />
            )}
            {view && editing && (
              <SaveViewDialog
                workspaceId={workspaceId}
                id={view.id}
                initial={{
                  name: view.name,
                  icon: view.icon,
                  shared: view.shared,
                  projectId: view.projectId,
                  filters: view.filters,
                  display: view.display,
                }}
                onClose={() => setEditing(false)}
                onSaved={(_id, saved, original) => {
                  if (
                    saved.projectId !== original.projectId ||
                    JSON.stringify(saved.filters) !==
                      JSON.stringify(original.filters) ||
                    JSON.stringify(saved.display) !==
                      JSON.stringify(original.display)
                  )
                    setResetVersion((version) => version + 1);
                }}
              />
            )}
          </>
        )}
      </div>
    </WorkspaceLayout>
  );
}

import { uniquePageItems } from "./unique-page-items";
import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { ArrowDown, ArrowUp, Plus } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import WorkspaceLayout from "@/components/common/workspace-layout";
import PageTitle from "@/components/page-title";
import { Button } from "@/components/ui/button";
import {
  getInitiatives,
  reorderInitiatives,
} from "@/fetchers/parity/initiatives";
import { useWorkspacePermission } from "@/hooks/use-workspace-permission";
import { formatDateMedium } from "@/lib/format";
import { HealthBadge } from "./health-badge";
import { InitiativeEditor } from "./initiative-editor";
import { usePlanningLabels } from "./labels";
import { ProgressMeter } from "./progress-meter";
import { refreshPlanning, usePlanningEnabled } from "./queries";

export function InitiativesPage({ workspaceId }: { workspaceId: string }) {
  const { t } = useTranslation();
  const labels = usePlanningLabels();
  const enabled = usePlanningEnabled("initiatives");
  const navigate = useNavigate();
  const client = useQueryClient();
  const { canUpdateProjects } = useWorkspacePermission();
  const [creating, setCreating] = useState(false);
  const [archived, setArchived] = useState(false);
  const query = useInfiniteQuery({
    queryKey: ["parity", "initiatives", workspaceId, archived],
    enabled,
    initialPageParam: 1,
    queryFn: ({ pageParam }) =>
      getInitiatives(workspaceId, pageParam, archived),
    getNextPageParam: (page) => (page.hasMore ? page.page + 1 : undefined),
  });
  const items = query.isError ? [] : uniquePageItems(query.data?.pages);
  const reorder = useMutation({
    mutationKey: ["parity"],
    mutationFn: ({ index, offset }: { index: number; offset: number }) => {
      const ids = items.map((item) => item.id);
      [ids[index], ids[index + offset]] = [ids[index + offset], ids[index]];
      return reorderInitiatives(workspaceId, ids);
    },
    onSettled: () => refreshPlanning(client),
  });
  return (
    <WorkspaceLayout
      title={t("parity:planning.initiatives")}
      headerActions={
        enabled &&
        canUpdateProjects() && (
          <Button size="sm" onClick={() => setCreating(true)}>
            <Plus className="size-4" />
            {t("parity:planning.newInitiative")}
          </Button>
        )
      }
    >
      <PageTitle title={t("parity:planning.initiatives")} />
      <div className="h-full overflow-y-auto p-5 sm:p-8">
        {!enabled ? (
          <p>{t("parity:planning.unavailable")}</p>
        ) : (
          <>
            <label className="mb-6 flex items-center gap-2 text-xs text-muted-foreground">
              <input
                type="checkbox"
                checked={archived}
                onChange={(event) => setArchived(event.target.checked)}
              />
              {t("parity:planning.showArchived")}
            </label>
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
            {reorder.error && (
              <p role="alert" className="text-sm text-destructive">
                {reorder.error.message}
              </p>
            )}
            {!query.isPending && !query.error && items.length === 0 && (
              <p className="text-sm text-muted-foreground">
                {t("parity:planning.noInitiatives")}
              </p>
            )}
            <div className="space-y-4">
              {items.map((initiative, index) => (
                <article key={initiative.id} className="rounded-xl border p-5">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="space-y-2">
                      <Link
                        to="/dashboard/workspace/$workspaceId/initiatives/$initiativeId"
                        params={{ workspaceId, initiativeId: initiative.id }}
                        className="font-semibold hover:underline"
                      >
                        {initiative.name}
                      </Link>
                      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                        <span>
                          {initiative.archivedAt
                            ? t("parity:planning.archived")
                            : labels.status[initiative.status]}
                        </span>
                        <span>
                          {initiative.ownerName ?? t("parity:planning.noOwner")}
                        </span>
                        <span>
                          {initiative.targetDate
                            ? formatDateMedium(
                                new Date(`${initiative.targetDate}T12:00:00`),
                              )
                            : t("parity:planning.noDate")}
                        </span>
                        <HealthBadge health={initiative.health} />
                      </div>
                    </div>
                    <div className="flex items-center gap-5">
                      <ProgressMeter progress={initiative.progress} compact />
                      {canUpdateProjects() &&
                        !archived &&
                        !query.isError &&
                        !query.hasNextPage && (
                          <div className="flex">
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label={t("parity:planning.moveUp")}
                              disabled={index === 0 || reorder.isPending}
                              onClick={() =>
                                reorder.mutate({ index, offset: -1 })
                              }
                            >
                              <ArrowUp className="size-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label={t("parity:planning.moveDown")}
                              disabled={
                                index === items.length - 1 || reorder.isPending
                              }
                              onClick={() =>
                                reorder.mutate({ index, offset: 1 })
                              }
                            >
                              <ArrowDown className="size-4" />
                            </Button>
                          </div>
                        )}
                    </div>
                  </div>
                </article>
              ))}
            </div>
            {!query.isError && query.hasNextPage && (
              <Button
                className="mt-5"
                variant="outline"
                disabled={query.isFetchingNextPage}
                onClick={() => query.fetchNextPage()}
              >
                {t("parity:planning.loadMore")}
              </Button>
            )}
          </>
        )}
      </div>
      {creating && (
        <InitiativeEditor
          workspaceId={workspaceId}
          onClose={() => setCreating(false)}
          onCreated={(initiativeId) =>
            navigate({
              to: "/dashboard/workspace/$workspaceId/initiatives/$initiativeId",
              params: { workspaceId, initiativeId },
            })
          }
        />
      )}
    </WorkspaceLayout>
  );
}

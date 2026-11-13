import { Link } from "@tanstack/react-router";
import { LayoutList } from "lucide-react";
import { useTranslation } from "react-i18next";
import WorkspaceLayout from "@/components/common/workspace-layout";
import PageTitle from "@/components/page-title";
import { Button } from "@/components/ui/button";
import { usePlanningEnabled } from "../planning/queries";
import { uniquePageItems } from "../planning/unique-page-items";
import { FavoriteButton } from "./favorite-button";
import { useSavedViews } from "./queries";
export function ViewsPage({ workspaceId }: { workspaceId: string }) {
  const { t } = useTranslation();
  const enabled = usePlanningEnabled("views");
  const query = useSavedViews(workspaceId);
  const items = query.isError ? [] : uniquePageItems(query.data?.pages);
  return (
    <WorkspaceLayout title={t("parity:views.title")}>
      <PageTitle title={t("parity:views.title")} />
      <div className="h-full overflow-auto p-4 sm:p-6">
        <div className="mx-auto max-w-4xl space-y-6">
          {enabled && (
            <Link
              to="/dashboard/workspace/$workspaceId/views/templates"
              params={{ workspaceId }}
              className="text-sm text-muted-foreground hover:underline"
            >
              {t("parity:views.manageTemplates")}
            </Link>
          )}
          <header>
            <h1 className="text-xl font-semibold">{t("parity:views.title")}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("parity:views.subtitle")}
            </p>
          </header>
          {!enabled ? (
            <p>{t("parity:planning.unavailable")}</p>
          ) : (
            <>
              <Link
                to="/dashboard/workspace/$workspaceId/issues"
                params={{ workspaceId }}
                className="flex items-center gap-3 rounded-lg border p-4 font-medium hover:bg-accent"
              >
                <LayoutList className="size-4" />
                {t("parity:views.allIssues")}
              </Link>
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
              {!query.isPending && !query.error && !items.length && (
                <p className="text-sm text-muted-foreground">
                  {t("parity:views.noViews")}
                </p>
              )}
              <div className="divide-y rounded-lg border empty:hidden">
                {items.map((view) => (
                  <article
                    key={view.id}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-accent/40"
                  >
                    <Link
                      to="/dashboard/workspace/$workspaceId/views/$viewId"
                      params={{ workspaceId, viewId: view.id }}
                      className="min-w-0 flex-1"
                    >
                      <span className="block truncate text-sm font-medium">
                        {view.icon ? `${view.icon} ` : ""}
                        {view.name}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {t(
                          view.shared
                            ? "parity:views.shared"
                            : "parity:views.personal",
                        )}
                      </span>
                    </Link>
                    <FavoriteButton
                      workspaceId={workspaceId}
                      kind="view"
                      targetId={view.id}
                    />
                  </article>
                ))}
              </div>
              {!query.isError && query.hasNextPage && (
                <Button
                  variant="outline"
                  disabled={query.isFetchingNextPage}
                  onClick={() => query.fetchNextPage()}
                >
                  {t("parity:views.more")}
                </Button>
              )}
            </>
          )}
        </div>
      </div>
    </WorkspaceLayout>
  );
}

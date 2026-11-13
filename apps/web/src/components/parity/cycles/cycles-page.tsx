import { useInfiniteQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Settings2 } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import WorkspaceLayout from "@/components/common/workspace-layout";
import PageTitle from "@/components/page-title";
import { Button } from "@/components/ui/button";
import { getCycles, type CyclePhase } from "@/fetchers/parity/cycles";
import { useWorkspacePermission } from "@/hooks/use-workspace-permission";
import { usePlanningEnabled } from "../planning/queries";
import { uniquePageItems } from "../planning/unique-page-items";
import { completion } from "./chart";
import { CycleOverview } from "./cycle-overview";
import { CycleSettingsDialog } from "./settings-dialog";

export function CyclesPage({
  workspaceId,
  phase = "current",
  cycleId,
}: {
  workspaceId: string;
  phase?: CyclePhase;
  cycleId?: string;
}) {
  const { t, i18n } = useTranslation();
  const enabled = usePlanningEnabled("cycles");
  const { canManageSettings } = useWorkspacePermission();
  const [editingSettings, setEditingSettings] = useState(false);
  const query = useInfiniteQuery({
    queryKey: ["parity", "cycles", workspaceId, phase],
    enabled,
    initialPageParam: 1,
    queryFn: ({ pageParam }) => getCycles(workspaceId, phase, pageParam),
    getNextPageParam: (page) => (page.hasMore ? page.page + 1 : undefined),
  });
  const settings = query.data?.pages[0]?.settings;
  const items = query.isError ? [] : uniquePageItems(query.data?.pages);
  return (
    <WorkspaceLayout
      title={t("parity:cycles.title")}
      headerActions={
        enabled && settings && !query.error && canManageSettings() ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setEditingSettings(true)}
          >
            <Settings2 className="size-4" />
            {t("parity:cycles.settings")}
          </Button>
        ) : null
      }
    >
      <PageTitle title={t("parity:cycles.title")} />
      <div className="h-full overflow-y-auto">
        <div className="mx-auto max-w-5xl space-y-7 p-5 sm:p-8">
          {!enabled ? (
            <p>{t("parity:planning.unavailable")}</p>
          ) : (
            <>
              <nav
                aria-label={t("parity:cycles.title")}
                className="flex gap-1 border-b pb-3"
              >
                {(["current", "upcoming", "past"] as const).map((tab) => (
                  <Link
                    key={tab}
                    to="/dashboard/workspace/$workspaceId/cycles"
                    params={{ workspaceId }}
                    search={{ phase: tab }}
                    aria-current={
                      !cycleId && phase === tab ? "page" : undefined
                    }
                    className={`rounded-md px-3 py-1.5 text-sm ${!cycleId && phase === tab ? "bg-accent font-medium" : "text-muted-foreground hover:bg-accent"}`}
                  >
                    {t(`parity:cycles.${tab}`)}
                  </Link>
                ))}
              </nav>
              {query.isPending ? (
                <p role="status">{t("parity:planning.loading")}</p>
              ) : query.error ? (
                <p role="alert">
                  {query.error.message}
                  <Button variant="ghost" onClick={() => void query.refetch()}>
                    {t("parity:planning.retry")}
                  </Button>
                </p>
              ) : cycleId ? (
                <CycleOverview
                  key={cycleId}
                  cycleId={cycleId}
                  workspaceId={workspaceId}
                />
              ) : phase === "current" && items[0] ? (
                <CycleOverview
                  key={items[0].id}
                  cycleId={items[0].id}
                  workspaceId={workspaceId}
                />
              ) : (
                <>
                  {!items.length && (
                    <div className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
                      {!settings?.cyclesEnabled && phase === "current"
                        ? t("parity:cycles.disabled")
                        : phase === "current"
                          ? t("parity:cycles.noCurrentCycle")
                          : t("parity:cycles.noCycles")}
                    </div>
                  )}
                  <div className="space-y-3">
                    {items.map((cycle) => {
                      const totals = cycle.summary ?? cycle.progress;
                      const percent = completion(
                        totals,
                        settings?.estimateScale !== "none",
                      );
                      const date = new Intl.DateTimeFormat(i18n.language, {
                        dateStyle: "medium",
                        timeZone: settings?.timeZone ?? "UTC",
                      });
                      return (
                        <Link
                          key={cycle.id}
                          to="/dashboard/workspace/$workspaceId/cycles/$cycleId"
                          params={{ workspaceId, cycleId: cycle.id }}
                          className="flex flex-wrap items-center justify-between gap-4 rounded-xl border p-5 hover:bg-accent/30"
                        >
                          <div>
                            <h2 className="font-medium">
                              {cycle.name ??
                                t("parity:cycles.number", {
                                  number: cycle.number,
                                })}
                            </h2>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {date.format(new Date(cycle.startsAt))} –{" "}
                              {date.format(
                                new Date(+new Date(cycle.endsAt) - 1),
                              )}
                            </p>
                          </div>
                          <div className="min-w-36 space-y-2">
                            <p className="text-xs text-muted-foreground">
                              {t("parity:cycles.progress", {
                                completed: totals.completedCount,
                                total: totals.scopeCount,
                              })}
                            </p>
                            <div
                              className="h-1.5 overflow-hidden rounded-full bg-muted"
                              role="progressbar"
                              aria-label={t("parity:cycles.completed")}
                              aria-valuemin={0}
                              aria-valuemax={100}
                              aria-valuenow={percent}
                            >
                              <div
                                className="h-full rounded-full bg-primary"
                                style={{ width: `${percent}%` }}
                              />
                            </div>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                  {query.hasNextPage && (
                    <Button
                      variant="outline"
                      disabled={query.isFetchingNextPage}
                      onClick={() => void query.fetchNextPage()}
                    >
                      {t("parity:cycles.loadMore")}
                    </Button>
                  )}
                </>
              )}
              {editingSettings && settings && !query.error && (
                <CycleSettingsDialog
                  settings={settings}
                  onClose={() => setEditingSettings(false)}
                />
              )}
            </>
          )}
        </div>
      </div>
    </WorkspaceLayout>
  );
}

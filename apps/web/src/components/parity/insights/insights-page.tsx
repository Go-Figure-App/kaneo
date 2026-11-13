import { useState } from "react";
import { useTranslation } from "react-i18next";
import WorkspaceLayout from "@/components/common/workspace-layout";
import PageTitle from "@/components/page-title";
import type { InsightMeasure } from "@/fetchers/parity/insights";
import { useCycleOptions } from "../cycles/queries";
import { usePlanningEnabled } from "../planning/queries";
import { InsightFiltersBar, type InsightFilters } from "./filters";
import { ReportPanel } from "./report-panel";

const measures: InsightMeasure[] = [
  "throughput",
  "created-completed",
  "lead-time",
  "cycle-time",
  "velocity",
  "burndown",
  "scope-change",
  "time-in-state",
  "workload",
  "time-to-triage",
];
export function InsightsPage({ workspaceId }: { workspaceId: string }) {
  const { t } = useTranslation();
  const enabled = usePlanningEnabled("insights");
  const cyclesEnabled = usePlanningEnabled("cycles");
  const cycles = useCycleOptions(workspaceId, enabled && cyclesEnabled);
  const [filters, setFilters] = useState<InsightFilters>({});
  const current = cycles.items.find((cycle) => cycle.phase === "current");
  const invalidRange = Boolean(
    filters.from &&
    filters.to &&
    (filters.from > filters.to ||
      (Date.parse(filters.to) - Date.parse(filters.from)) / 86_400_000 > 730),
  );
  return (
    <WorkspaceLayout title={t("parity:insights.title")}>
      <PageTitle title={t("parity:insights.title")} />
      <div className="h-full overflow-auto p-4 sm:p-6">
        <div className="mx-auto max-w-7xl space-y-6">
          <header>
            <h1 className="text-xl font-semibold tracking-tight">
              {t("parity:insights.title")}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("parity:insights.subtitle")}
            </p>
          </header>
          {!enabled ? (
            <p>{t("parity:planning.unavailable")}</p>
          ) : (
            <>
              <InsightFiltersBar
                workspaceId={workspaceId}
                filters={filters}
                onChange={setFilters}
              />
              {invalidRange ? (
                <p role="alert" className="text-sm text-destructive">
                  {t("parity:insights.invalidRange")}
                </p>
              ) : (
                <div className="grid gap-4 xl:grid-cols-2">
                  {measures.map((measure) => (
                    <ReportPanel
                      key={measure}
                      workspaceId={workspaceId}
                      query={
                        measure === "workload"
                          ? {
                              projectId: filters.projectId,
                              initiativeId: filters.initiativeId,
                              cycleId: filters.cycleId,
                              measure,
                            }
                          : measure === "burndown"
                            ? {
                                ...filters,
                                measure,
                                cycleId: filters.cycleId ?? current?.id,
                              }
                            : { ...filters, measure }
                      }
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </WorkspaceLayout>
  );
}

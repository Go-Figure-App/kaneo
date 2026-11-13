import { useInfiniteQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { getInitiatives } from "@/fetchers/parity/initiatives";
import type { InsightsQuery } from "@/fetchers/parity/insights";
import useGetProjects from "@/hooks/queries/project/use-get-projects";
import { useCycleOptions } from "../cycles/queries";
import { usePlanningEnabled } from "../planning/queries";
import { uniquePageItems } from "../planning/unique-page-items";

export type InsightFilters = Omit<InsightsQuery, "measure" | "slice">;
export function InsightFiltersBar({
  workspaceId,
  filters,
  onChange,
}: {
  workspaceId: string;
  filters: InsightFilters;
  onChange: (value: InsightFilters) => void;
}) {
  const { t } = useTranslation();
  const enabled = usePlanningEnabled("insights");
  const initiativesEnabled = usePlanningEnabled("initiatives");
  const cyclesEnabled = usePlanningEnabled("cycles");
  const projects = useGetProjects({ workspaceId, enabled });
  const initiatives = useInfiniteQuery({
    queryKey: ["parity", "insight-initiatives", workspaceId],
    queryFn: ({ pageParam }) => getInitiatives(workspaceId, pageParam),
    initialPageParam: 1,
    getNextPageParam: (page) => (page.hasMore ? page.page + 1 : undefined),
    enabled: enabled && initiativesEnabled,
  });
  const cycles = useCycleOptions(workspaceId, enabled && cyclesEnabled);
  const field = "h-8 min-w-0 rounded-md border bg-background px-2 text-xs";
  const error = projects.error ?? initiatives.error ?? cycles.error;
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <select
          aria-label={t("parity:cycles.project")}
          className={field}
          value={filters.projectId ?? ""}
          onChange={(event) =>
            onChange({ ...filters, projectId: event.target.value || undefined })
          }
        >
          <option value="">{t("parity:cycles.allProjects")}</option>
          {projects.isError && filters.projectId && (
            <option value={filters.projectId} disabled>
              {t("parity:cycles.project")}
            </option>
          )}
          {!projects.isError &&
            projects.data?.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
        </select>
        {initiativesEnabled && (
          <select
            aria-label={t("parity:insights.initiative")}
            className={field}
            value={filters.initiativeId ?? ""}
            onChange={(event) =>
              onChange({
                ...filters,
                initiativeId: event.target.value || undefined,
              })
            }
          >
            <option value="">{t("parity:insights.allInitiatives")}</option>
            {initiatives.isError && filters.initiativeId && (
              <option value={filters.initiativeId} disabled>
                {t("parity:insights.initiative")}
              </option>
            )}
            {!initiatives.isError &&
              uniquePageItems(initiatives.data?.pages).map((initiative) => (
                <option key={initiative.id} value={initiative.id}>
                  {initiative.name}
                </option>
              ))}
          </select>
        )}
        {initiatives.hasNextPage && (
          <Button
            size="sm"
            variant="ghost"
            disabled={initiatives.isFetchingNextPage}
            onClick={() => void initiatives.fetchNextPage()}
          >
            {t("parity:insights.moreInitiatives")}
          </Button>
        )}
        {cyclesEnabled && (
          <select
            aria-label={t("parity:cycles.cycle")}
            className={field}
            value={filters.cycleId ?? ""}
            onChange={(event) =>
              onChange({ ...filters, cycleId: event.target.value || undefined })
            }
          >
            <option value="">{t("parity:insights.allCycles")}</option>
            {cycles.isError && filters.cycleId && (
              <option value={filters.cycleId} disabled>
                {t("parity:cycles.cycle")}
              </option>
            )}
            {cycles.items.map((cycle) => (
              <option key={cycle.id} value={cycle.id}>
                {cycle.name ??
                  t("parity:cycles.number", { number: cycle.number })}
              </option>
            ))}
          </select>
        )}
        {cycles.hasNextPage && (
          <Button
            size="sm"
            variant="ghost"
            disabled={cycles.isFetchingNextPage}
            onClick={() => void cycles.fetchNextPage()}
          >
            {t("parity:cycles.loadMore")}
          </Button>
        )}
        <input
          type="date"
          min="0001-01-01"
          max="9999-12-31"
          aria-label={t("parity:insights.from")}
          className={field}
          value={filters.from ?? ""}
          onChange={(event) =>
            onChange({ ...filters, from: event.target.value || undefined })
          }
        />
        <span aria-hidden="true" className="text-muted-foreground">
          –
        </span>
        <input
          type="date"
          min="0001-01-01"
          max="9999-12-31"
          aria-label={t("parity:insights.to")}
          className={field}
          value={filters.to ?? ""}
          onChange={(event) =>
            onChange({ ...filters, to: event.target.value || undefined })
          }
        />
        <Button variant="ghost" size="sm" onClick={() => onChange({})}>
          {t("parity:insights.reset")}
        </Button>
      </div>
      {!filters.from && !filters.to && !filters.cycleId && (
        <p className="text-xs text-muted-foreground">
          {t("parity:insights.defaultRange")}
        </p>
      )}
      {error && (
        <p role="alert" className="text-xs text-destructive">
          {error.message}
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              void projects.refetch();
              if (initiativesEnabled) void initiatives.refetch();
              if (cyclesEnabled) void cycles.refetch();
            }}
          >
            {t("parity:planning.retry")}
          </Button>
        </p>
      )}
    </div>
  );
}

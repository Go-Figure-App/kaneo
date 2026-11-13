import { useQuery } from "@tanstack/react-query";
import { lazy, Suspense, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { getInsights, type InsightsQuery } from "@/fetchers/parity/insights";
import { usePlanningEnabled } from "../planning/queries";
import { durationMeasure } from "./chart-data";
import { useInsightLabels } from "./labels";
import { ReportTable } from "./report-table";

// Charting code is fetched only when an insight chart is actually rendered.
const ReportChart = lazy(() => import("./report-chart"));
export function ReportPanel({
  workspaceId,
  query,
  title,
}: {
  workspaceId: string;
  query: InsightsQuery;
  title?: string;
}) {
  const { t } = useTranslation();
  const labels = useInsightLabels();
  const enabled = usePlanningEnabled("insights");
  const [points, setPoints] = useState(false);
  const needsCycle = query.measure === "burndown" && !query.cycleId;
  const result = useQuery({
    queryKey: ["parity", "insights", workspaceId, query],
    queryFn: () => getInsights(workspaceId, query),
    enabled: enabled && !needsCycle,
    staleTime: 60_000,
  });
  const data = result.isError ? undefined : result.data;
  const showPoints =
    points && Boolean(data?.estimates) && !durationMeasure(query.measure);
  if (!enabled) return null;
  return (
    <section
      className="min-w-0 rounded-xl border bg-background p-4 sm:p-5"
      aria-label={title ?? labels.measure(query.measure)}
    >
      <div className="mb-2 flex items-center justify-between gap-3">
        <h2 className="text-sm font-medium">
          {title ?? labels.measure(query.measure)}
        </h2>
        {data?.estimates && !durationMeasure(query.measure) ? (
          <div className="flex rounded-md border p-0.5">
            {([false, true] as const).map((value) => (
              <button
                key={String(value)}
                type="button"
                aria-pressed={showPoints === value}
                onClick={() => setPoints(value)}
                className={`rounded px-2 py-1 text-xs ${showPoints === value ? "bg-muted font-medium" : "text-muted-foreground"}`}
              >
                {t(value ? "parity:insights.points" : "parity:insights.issues")}
              </button>
            ))}
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">
            {t(
              durationMeasure(query.measure)
                ? "parity:insights.days"
                : "parity:insights.issues",
            )}
          </span>
        )}
      </div>
      <p className="mb-5 text-xs leading-relaxed text-muted-foreground">
        {t(`parity:insights.descriptions.${query.measure}`)}
      </p>
      {needsCycle ? (
        <p className="py-12 text-center text-sm text-muted-foreground">
          {t("parity:insights.chooseCycle")}
        </p>
      ) : result.isPending ? (
        <p
          role="status"
          className="py-12 text-center text-sm text-muted-foreground"
        >
          {t("parity:planning.loading")}
        </p>
      ) : result.error ? (
        <div role="alert" className="py-8 text-sm">
          <p>{result.error.message}</p>
          <Button variant="ghost" onClick={() => void result.refetch()}>
            {t("parity:planning.retry")}
          </Button>
        </div>
      ) : (
        data && (
          <>
            {!data.historyAvailable || data.rows.length === 0 ? (
              <p className="py-12 text-center text-sm text-muted-foreground">
                {t("parity:insights.noData")}
              </p>
            ) : (
              <>
                <Suspense
                  fallback={<p role="status">{t("parity:planning.loading")}</p>}
                >
                  <ReportChart report={data} points={showPoints} />
                </Suspense>
                <ReportTable report={data} points={showPoints} />
              </>
            )}
            {data.partialHistory && (
              <p className="mt-3 text-xs text-muted-foreground">
                {t("parity:insights.partialHistory")}
              </p>
            )}
            <p className="mt-3 text-xs text-muted-foreground">
              {t("parity:insights.timeZone", { zone: data.timeZone })}
            </p>
          </>
        )
      )}
    </section>
  );
}

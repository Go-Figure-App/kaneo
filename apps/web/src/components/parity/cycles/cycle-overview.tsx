import { useQuery } from "@tanstack/react-query";
import { Pencil } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { getCycle } from "@/fetchers/parity/cycles";
import { useWorkspacePermission } from "@/hooks/use-workspace-permission";
import { BurndownChart } from "./burndown-chart";
import { completion, daysLeft } from "./chart";
import { CycleEditor } from "./cycle-editor";
import { CycleTaskList } from "./task-list";

export function CycleOverview({
  cycleId,
  workspaceId,
}: {
  cycleId: string;
  workspaceId: string;
}) {
  const { t, i18n } = useTranslation();
  const { canUpdateProjects } = useWorkspacePermission();
  const [editing, setEditing] = useState(false);
  const query = useQuery({
    queryKey: ["parity", "cycle", cycleId, workspaceId],
    queryFn: () => getCycle(cycleId),
  });
  if (query.isPending)
    return <p role="status">{t("parity:planning.loading")}</p>;
  if (query.error)
    return (
      <p role="alert">
        {query.error.message}
        <Button variant="ghost" onClick={() => void query.refetch()}>
          {t("parity:planning.retry")}
        </Button>
      </p>
    );
  const cycle = query.data;
  if (cycle.workspaceId !== workspaceId)
    return <p role="alert">{t("parity:planning.unavailable")}</p>;
  const totals = cycle.summary ?? cycle.progress;
  const percent = completion(totals, cycle.settings.estimateScale !== "none");
  const date = new Intl.DateTimeFormat(i18n.language, {
    dateStyle: "medium",
    timeZone: cycle.settings.timeZone,
  });
  return (
    <div className="space-y-7">
      <header className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="mb-1 text-xs text-muted-foreground">
              {t(`parity:cycles.${cycle.phase}`)}
            </div>
            <h1 className="text-2xl font-semibold tracking-tight">
              {cycle.name ??
                t("parity:cycles.number", { number: cycle.number })}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {date.format(new Date(cycle.startsAt))} –{" "}
              {date.format(new Date(+new Date(cycle.endsAt) - 1))}
            </p>
          </div>
          {canUpdateProjects() && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditing(true)}
            >
              <Pencil className="size-3.5" />
              {t("parity:cycles.edit")}
            </Button>
          )}
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border p-4">
            <div className="text-xs text-muted-foreground">
              {t("parity:cycles.completed")}
            </div>
            <div className="mt-1 text-lg font-semibold tabular-nums">
              {t("parity:cycles.completion", { percent })}
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              {t("parity:cycles.progress", {
                completed: totals.completedCount,
                total: totals.scopeCount,
              })}
            </div>
            <div
              className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted"
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
          <div className="rounded-lg border p-4">
            <div className="text-xs text-muted-foreground">
              {t("parity:cycles.scope")}
            </div>
            <div className="mt-1 text-lg font-semibold tabular-nums">
              {new Intl.NumberFormat(i18n.language).format(totals.scopeCount)}
            </div>
            {cycle.settings.estimateScale !== "none" && (
              <div className="mt-1 text-xs text-muted-foreground">
                {t("parity:cycles.totalPoints", { count: totals.scopePoints })}
              </div>
            )}
          </div>
          <div className="rounded-lg border p-4">
            <div className="text-xs text-muted-foreground">
              {cycle.summary
                ? t("parity:cycles.rolledOver")
                : t("parity:cycles.remaining")}
            </div>
            <div className="mt-1 text-lg font-semibold tabular-nums">
              {new Intl.NumberFormat(i18n.language).format(
                cycle.summary?.rolledOverCount ??
                  Math.max(0, totals.scopeCount - totals.completedCount),
              )}
            </div>
            {cycle.phase === "current" && (
              <div className="mt-1 text-xs text-muted-foreground">
                {t("parity:cycles.daysLeft", {
                  count: daysLeft(cycle.endsAt, cycle.settings.timeZone),
                })}
              </div>
            )}
          </div>
        </div>
      </header>
      <BurndownChart cycle={cycle} />
      <CycleTaskList
        cycleId={cycle.id}
        workspaceId={workspaceId}
        settings={cycle.settings}
      />
      {editing && (
        <CycleEditor cycle={cycle} onClose={() => setEditing(false)} />
      )}
    </div>
  );
}

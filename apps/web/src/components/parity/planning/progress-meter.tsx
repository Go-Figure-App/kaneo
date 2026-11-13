import { useTranslation } from "react-i18next";
import { Progress } from "@/components/ui/progress";
import type { PlanningProgress } from "@/fetchers/parity/projects";

export function ProgressMeter({
  progress,
  compact = false,
}: {
  progress: PlanningProgress;
  compact?: boolean;
}) {
  const { t } = useTranslation();
  const percent = progress.pointsPercent ?? progress.percent;
  return (
    <div className="min-w-28 space-y-2">
      <div className="flex items-center justify-between gap-3 text-xs tabular-nums">
        <span className="text-muted-foreground">
          {t("parity:planning.progress")}
        </span>
        <span>{percent}%</span>
      </div>
      <Progress
        value={percent}
        aria-label={t("parity:planning.progress")}
        className="h-1.5"
      />
      {!compact && (
        <p className="text-xs text-muted-foreground">
          {t("parity:planning.completed", progress)}
          {progress.totalPoints !== null && (
            <>
              {" "}
              ·{" "}
              {t("parity:planning.points", {
                completed: progress.completedPoints,
                total: progress.totalPoints,
              })}
            </>
          )}
        </p>
      )}
    </div>
  );
}

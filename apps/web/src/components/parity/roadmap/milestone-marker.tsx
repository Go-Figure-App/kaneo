import { useTranslation } from "react-i18next";
import { parseTaskDate } from "@/components/gantt/timeline";
import type { RoadmapMilestone } from "@/fetchers/parity/roadmap";
import { cn } from "@/lib/cn";
import { dateOffset, shiftDate, type TimelineWindow } from "./timeline";
import { useDragDays } from "./use-drag-days";

export function MilestoneMarker({
  milestone,
  window,
  disabled,
  onChange,
}: {
  milestone: RoadmapMilestone;
  window: TimelineWindow;
  disabled: boolean;
  onChange: (date: string) => void;
}) {
  const { t } = useTranslation();
  const drag = useDragDays(window.dayWidth, disabled, (days) => {
    const date = milestone.targetDate && shiftDate(milestone.targetDate, days);
    if (date && date !== milestone.targetDate) onChange(date);
  });
  const date =
    milestone.targetDate && shiftDate(milestone.targetDate, drag.delta);
  const parsed = parseTaskDate(date || null);
  if (!parsed) return null;
  const left = dateOffset(parsed, window) + window.dayWidth / 2;
  const outside = left < 0 || left > window.width;
  if (outside && !drag.active) return null;
  const percent =
    milestone.progress.pointsPercent ?? milestone.progress.percent;
  return (
    <button
      type="button"
      disabled={disabled}
      {...drag.handlers}
      aria-label={t("parity:roadmap.moveMilestone", { name: milestone.name })}
      aria-describedby="roadmap-edit-help"
      title={`${milestone.name} · ${date} · ${Math.round(percent)}%`}
      className="absolute top-9 z-10 flex size-6 -translate-x-1/2 touch-none items-center justify-center rounded focus-visible:outline-2 focus-visible:outline-ring disabled:cursor-default"
      style={{
        left: Math.max(0, Math.min(window.width, left)),
        opacity: outside ? 0 : undefined,
        pointerEvents: outside ? "none" : undefined,
      }}
    >
      <span
        className={cn(
          "size-2.5 rotate-45 border-2 border-background shadow-sm",
          percent === 100 ? "bg-emerald-600" : "bg-foreground",
        )}
      />
    </button>
  );
}

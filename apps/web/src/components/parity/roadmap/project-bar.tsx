import { useTranslation } from "react-i18next";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { PlanInput } from "@/fetchers/parity/projects";
import type { RoadmapProject } from "@/fetchers/parity/roadmap";
import { cn } from "@/lib/cn";
import {
  dateOffset,
  editDates,
  scheduled,
  type DateEdit,
  type TimelineWindow,
} from "./timeline";
import { useDragDays } from "./use-drag-days";

export function ProjectBar({
  project,
  window,
  disabled,
  onChange,
}: {
  project: RoadmapProject;
  window: TimelineWindow;
  disabled: boolean;
  onChange: (patch: PlanInput) => void;
}) {
  const { t } = useTranslation();
  const commit = (kind: DateEdit, days: number) => {
    const patch = editDates(project.startDate, project.targetDate, kind, days);
    if (
      patch &&
      (patch.startDate !== project.startDate ||
        patch.targetDate !== project.targetDate)
    )
      onChange(patch);
  };
  const move = useDragDays(window.dayWidth, disabled, (days) =>
    commit("move", days),
  );
  const start = useDragDays(window.dayWidth, disabled, (days) =>
    commit("start", days),
  );
  const end = useDragDays(window.dayWidth, disabled, (days) =>
    commit("end", days),
  );
  const preview = editDates(
    project.startDate,
    project.targetDate,
    start.delta ? "start" : end.delta ? "end" : "move",
    start.delta || end.delta || move.delta,
  );
  const range = scheduled(
    preview?.startDate ?? project.startDate,
    preview?.targetDate ?? project.targetDate,
  );
  if (!range) return null;
  const left = dateOffset(range.start, window),
    right = dateOffset(range.end, window) + window.dayWidth;
  if (right <= 0 || left >= window.width) return null;
  const percent = project.progress.pointsPercent ?? project.progress.percent;
  return (
    <div
      data-testid={`roadmap-bar-${project.id}`}
      className={cn(
        "absolute top-3 h-8 rounded-md border shadow-sm",
        project.health === "off_track"
          ? "border-red-400/60 bg-red-100 dark:bg-red-950"
          : project.health === "at_risk"
            ? "border-amber-400/60 bg-amber-100 dark:bg-amber-950"
            : "border-emerald-400/60 bg-emerald-100 dark:bg-emerald-950",
      )}
      style={{
        left: Math.max(0, left),
        width: Math.min(window.width, right) - Math.max(0, left),
      }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-0 rounded-l-md bg-current opacity-10"
        style={{ width: `${Math.max(0, Math.min(100, percent))}%` }}
      />
      <button
        type="button"
        disabled={disabled}
        {...move.handlers}
        aria-label={t("parity:roadmap.moveProject", { name: project.name })}
        aria-describedby="roadmap-edit-help"
        title={`${project.name} · ${preview?.startDate} – ${preview?.targetDate} · ${percent}%`}
        className="relative flex h-full w-full touch-none items-center gap-1.5 overflow-hidden rounded-md px-3 text-left text-xs focus-visible:outline-2 focus-visible:outline-ring disabled:cursor-default"
      >
        {project.leadId && (
          <Avatar className="size-5">
            <AvatarImage
              src={project.leadImage ?? undefined}
              alt={project.leadName ?? ""}
            />
            <AvatarFallback>{project.leadName?.slice(0, 1)}</AvatarFallback>
          </Avatar>
        )}
        <span className="truncate font-medium">{project.name}</span>
        <span className="ml-auto shrink-0 tabular-nums">
          {Math.round(percent)}%
        </span>
      </button>
      {!disabled && left >= 0 && (
        <button
          type="button"
          {...start.handlers}
          aria-label={t("parity:roadmap.resizeStart", { name: project.name })}
          aria-describedby="roadmap-edit-help"
          className="absolute inset-y-0 left-0 w-2 cursor-ew-resize touch-none rounded-l-md bg-current/10 focus-visible:outline-2 focus-visible:outline-ring"
        />
      )}
      {!disabled && right <= window.width && (
        <button
          type="button"
          {...end.handlers}
          aria-label={t("parity:roadmap.resizeEnd", { name: project.name })}
          aria-describedby="roadmap-edit-help"
          className="absolute inset-y-0 right-0 w-2 cursor-ew-resize touch-none rounded-r-md bg-current/10 focus-visible:outline-2 focus-visible:outline-ring"
        />
      )}
    </div>
  );
}

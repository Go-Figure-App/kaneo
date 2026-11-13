import { Link } from "@tanstack/react-router";
import { CalendarDays } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { DragEvent } from "react";
import type { PlanInput } from "@/fetchers/parity/projects";
import type { Roadmap, RoadmapProject } from "@/fetchers/parity/roadmap";
import { Button } from "@/components/ui/button";
import { formatDate, formatDateShort } from "@/lib/format";
import { HealthBadge } from "../planning/health-badge";
import { roadmapGroups } from "./grouping";
import { MilestoneMarker } from "./milestone-marker";
import { ProjectBar } from "./project-bar";
import {
  dateAtX,
  dateOffset,
  scheduled,
  type TimelineWindow,
  type Zoom,
} from "./timeline";

export const roadmapDragType = "application/x-kaneo-roadmap-project";
const labelWidth = 240;
export function TimelineView({
  projects,
  initiatives,
  selected,
  window,
  zoom,
  disabled,
  onProject,
  onMilestone,
  onEdit,
  onSchedule,
}: {
  projects: RoadmapProject[];
  initiatives: Roadmap["initiatives"];
  selected: string;
  window: TimelineWindow;
  zoom: Zoom;
  disabled: boolean;
  onProject: (id: string, patch: PlanInput) => void;
  onMilestone: (id: string, date: string) => void;
  onEdit: (project: RoadmapProject) => void;
  onSchedule: (id: string, date: string) => void;
}) {
  const { t } = useTranslation();
  const groups = roadmapGroups(
    projects.filter((project) =>
      scheduled(project.startDate, project.targetDate),
    ),
    initiatives,
    selected,
  );
  const today = dateOffset(new Date(), window) + window.dayWidth / 2;
  const drop = (event: DragEvent<HTMLDivElement>) => {
    if (disabled) return;
    event.preventDefault();
    const id = event.dataTransfer.getData(roadmapDragType);
    if (
      !projects.some(
        (project) =>
          project.id === id &&
          !scheduled(project.startDate, project.targetDate),
      )
    )
      return;
    onSchedule(
      id,
      dateAtX(
        event.clientX - event.currentTarget.getBoundingClientRect().left,
        window,
      ),
    );
  };
  const dragOver = (event: DragEvent<HTMLDivElement>) => {
    if (!disabled && event.dataTransfer.types.includes(roadmapDragType)) {
      event.preventDefault();
      event.dataTransfer.dropEffect = "move";
    }
  };
  const grid = {
    width: window.width,
    backgroundImage:
      "linear-gradient(to right, var(--border) 1px, transparent 1px)",
    backgroundSize: `${window.dayWidth * (zoom === "year" ? 7 : 1)}px 100%`,
  };
  return (
    <div
      className="w-full min-w-0 flex-1 overflow-auto rounded-lg border"
      role="region"
      aria-label={t("parity:roadmap.timeline")}
    >
      <div
        className="relative min-h-60"
        style={{ width: labelWidth + window.width }}
      >
        <div className="sticky top-0 z-20 flex h-12 border-b bg-background">
          <div
            className="sticky left-0 z-30 flex shrink-0 items-center border-r bg-background px-4 text-xs font-medium"
            style={{ width: labelWidth }}
          >
            {t("parity:planning.projects")}
          </div>
          <div className="relative" style={grid}>
            {window.days.map((day, index) => {
              const visible =
                zoom === "year"
                  ? day.getDate() === 1
                  : zoom === "quarter"
                    ? day.getDay() === 1 || index === 0
                    : true;
              return visible ? (
                <span
                  key={+day}
                  className="absolute top-4 whitespace-nowrap px-1 text-[10px] text-muted-foreground"
                  style={{ left: index * window.dayWidth }}
                >
                  {zoom === "year"
                    ? formatDate(day, { month: "short" })
                    : zoom === "week"
                      ? formatDate(day, { weekday: "short", day: "numeric" })
                      : zoom === "quarter"
                        ? formatDateShort(day)
                        : day.getDate()}
                </span>
              ) : null;
            })}
          </div>
        </div>
        {groups.map((group) => (
          <section
            key={group.id}
            aria-label={group.name || t("parity:roadmap.noInitiative")}
          >
            <h2
              className="sticky left-0 flex h-9 items-center bg-muted/50 px-4 text-xs font-semibold"
              style={{ width: labelWidth + window.width }}
            >
              <span className="sticky left-4">
                {group.name || t("parity:roadmap.noInitiative")}
              </span>
            </h2>
            {group.projects.map((project) => (
              <div key={project.id} className="flex border-b last:border-b-0">
                <div
                  className="sticky left-0 z-10 flex h-16 shrink-0 items-center gap-2 border-r bg-background px-3"
                  style={{ width: labelWidth }}
                >
                  <div className="min-w-0 flex-1">
                    <Link
                      to="/dashboard/workspace/$workspaceId/project/$projectId/overview"
                      params={{
                        workspaceId: project.workspaceId,
                        projectId: project.id,
                      }}
                      className="block truncate text-xs font-medium hover:underline"
                    >
                      {project.name}
                    </Link>
                    <HealthBadge health={project.health} />
                  </div>
                  {!disabled && (
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={t("parity:roadmap.editDates", {
                        name: project.name,
                      })}
                      onClick={() => onEdit(project)}
                    >
                      <CalendarDays className="size-3.5" />
                    </Button>
                  )}
                </div>
                <div
                  className="relative h-16 overflow-hidden"
                  style={grid}
                  onDrop={drop}
                  onDragOver={dragOver}
                >
                  <ProjectBar
                    project={project}
                    window={window}
                    disabled={disabled}
                    onChange={(patch) => onProject(project.id, patch)}
                  />
                  {project.milestones.map((milestone) => (
                    <MilestoneMarker
                      key={milestone.id}
                      milestone={milestone}
                      window={window}
                      disabled={disabled}
                      onChange={(date) => onMilestone(milestone.id, date)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </section>
        ))}
        <div className="flex">
          <div
            className="sticky left-0 z-10 shrink-0 bg-background"
            style={{ width: labelWidth }}
          />
          <div
            data-testid="roadmap-drop-zone"
            className="flex h-20 items-center justify-center text-xs text-muted-foreground"
            style={grid}
            onDrop={drop}
            onDragOver={dragOver}
          >
            {!disabled && t("parity:roadmap.dropHere")}
          </div>
        </div>
        {today >= 0 && today <= window.width && (
          <div
            data-testid="roadmap-today"
            aria-label={t("parity:roadmap.today")}
            className="pointer-events-none absolute inset-y-12 bottom-0 z-10 border-l-2 border-primary/70"
            style={{ left: labelWidth + today }}
          />
        )}
      </div>
    </div>
  );
}

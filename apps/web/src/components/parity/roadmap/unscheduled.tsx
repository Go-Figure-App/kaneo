import { useTranslation } from "react-i18next";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import type { RoadmapProject } from "@/fetchers/parity/roadmap";
import { HealthBadge } from "../planning/health-badge";
import { roadmapDragType } from "./timeline-view";
import { scheduled } from "./timeline";

export function Unscheduled({
  projects,
  disabled,
  onEdit,
}: {
  projects: RoadmapProject[];
  disabled: boolean;
  onEdit: (project: RoadmapProject) => void;
}) {
  const { t } = useTranslation();
  const items = projects.filter(
    (project) => !scheduled(project.startDate, project.targetDate),
  );
  if (!items.length) return null;
  return (
    <aside
      className="w-full shrink-0 space-y-3 rounded-lg border p-3 lg:w-60"
      aria-label={t("parity:roadmap.unscheduled")}
    >
      <h2 className="text-xs font-semibold">
        {t("parity:roadmap.unscheduled")}{" "}
        <span className="text-muted-foreground">{items.length}</span>
      </h2>
      {!disabled && (
        <p className="text-xs text-muted-foreground">
          {t("parity:roadmap.scheduleHint")}
        </p>
      )}
      {items.map((project) => (
        <article
          key={project.id}
          draggable={!disabled}
          onDragStart={(event) => {
            event.dataTransfer.setData(roadmapDragType, project.id);
            event.dataTransfer.effectAllowed = "move";
          }}
          className="space-y-2 rounded-md border bg-background p-3"
        >
          <Link
            to="/dashboard/workspace/$workspaceId/project/$projectId/overview"
            params={{ workspaceId: project.workspaceId, projectId: project.id }}
            className="block text-xs font-medium hover:underline"
          >
            {project.name}
          </Link>
          <HealthBadge health={project.health} />
          <p className="text-[11px] text-muted-foreground">
            {project.startDate ?? t("parity:planning.noDate")} –{" "}
            {project.targetDate ?? t("parity:planning.noDate")}
          </p>
          {!disabled && (
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              aria-label={t("parity:roadmap.editDates", { name: project.name })}
              onClick={() => onEdit(project)}
            >
              {t("parity:roadmap.schedule")}
            </Button>
          )}
        </article>
      ))}
    </aside>
  );
}

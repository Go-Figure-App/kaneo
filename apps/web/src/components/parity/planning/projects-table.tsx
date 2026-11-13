import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import type { getProjectPlans } from "@/fetchers/parity/projects";
import { formatDateMedium } from "@/lib/format";
import { HealthBadge } from "./health-badge";
import { usePlanningLabels } from "./labels";
import { ProgressMeter } from "./progress-meter";

export function ProjectsTable({
  projects,
}: {
  projects: Awaited<ReturnType<typeof getProjectPlans>>["items"];
}) {
  const { t } = useTranslation();
  const labels = usePlanningLabels();
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="border-b text-xs text-muted-foreground">
          <tr>
            <th className="px-3 py-3 font-normal">
              {t("parity:planning.name")}
            </th>
            <th className="px-3 py-3 font-normal">
              {t("parity:planning.status")}
            </th>
            <th className="px-3 py-3 font-normal">
              {t("parity:planning.lead")}
            </th>
            <th className="px-3 py-3 font-normal">
              {t("parity:planning.targetDate")}
            </th>
            <th className="px-3 py-3 font-normal">
              {t("parity:planning.health")}
            </th>
            <th className="px-3 py-3 font-normal">
              {t("parity:planning.progress")}
            </th>
          </tr>
        </thead>
        <tbody>
          {projects.map((project) => (
            <tr
              key={project.id}
              className="border-b last:border-0 hover:bg-accent/30"
            >
              <td className="min-w-52 px-3 py-4">
                <Link
                  className="font-medium hover:underline"
                  to="/dashboard/workspace/$workspaceId/project/$projectId/overview"
                  params={{
                    workspaceId: project.workspaceId,
                    projectId: project.id,
                  }}
                >
                  {project.name}
                </Link>
              </td>
              <td className="whitespace-nowrap px-3 py-4 text-xs">
                {labels.status[project.status]}
              </td>
              <td className="px-3 py-4 text-xs">
                {project.leadName ?? t("parity:planning.noLead")}
              </td>
              <td className="whitespace-nowrap px-3 py-4 text-xs">
                {project.targetDate
                  ? formatDateMedium(new Date(`${project.targetDate}T12:00:00`))
                  : t("parity:planning.noDate")}
              </td>
              <td className="px-3 py-4">
                <HealthBadge health={project.health} />
              </td>
              <td className="min-w-36 px-3 py-4">
                <ProgressMeter progress={project.progress} compact />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

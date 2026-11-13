import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import ProjectLayout from "@/components/common/project-layout";
import PageTitle from "@/components/page-title";
import { MarkdownRenderer } from "@/components/public-project/markdown-renderer";
import { Button } from "@/components/ui/button";
import { getProjectPlan } from "@/fetchers/parity/projects";
import { useWorkspacePermission } from "@/hooks/use-workspace-permission";
import { formatDateMedium } from "@/lib/format";
import { HealthBadge } from "./health-badge";
import { usePlanningLabels } from "./labels";
import { Milestones } from "./milestones";
import { ProjectEditor } from "./project-editor";
import { ProgressMeter } from "./progress-meter";
import { usePlanningEnabled } from "./queries";
import { UpdateFeed } from "./update-feed";

export function ProjectOverview({
  workspaceId,
  projectId,
}: {
  workspaceId: string;
  projectId: string;
}) {
  const { t } = useTranslation();
  const labels = usePlanningLabels();
  const enabled = usePlanningEnabled("projects");
  const { canUpdateProjects } = useWorkspacePermission();
  const [editing, setEditing] = useState(false);
  const query = useQuery({
    queryKey: ["parity", "project-plan", projectId],
    queryFn: () => getProjectPlan(projectId),
    enabled,
  });
  const project = query.isError ? undefined : query.data;
  const date = (value: string | null) =>
    value
      ? formatDateMedium(new Date(`${value}T12:00:00`))
      : t("parity:planning.noDate");
  return (
    <ProjectLayout
      workspaceId={workspaceId}
      projectId={projectId}
      showViewSwitcher={false}
      toolbar={
        <Link
          to="/dashboard/workspace/$workspaceId/project/$projectId/board"
          params={{ workspaceId, projectId }}
          className="rounded-md px-3 py-1.5 text-xs hover:bg-accent"
        >
          {t("parity:planning.board")}
        </Link>
      }
    >
      <PageTitle
        title={
          project
            ? `${project.name} · ${t("parity:planning.overview")}`
            : t("parity:planning.overview")
        }
      />
      <div className="h-full overflow-y-auto">
        <div className="mx-auto max-w-6xl space-y-8 px-5 py-8 sm:px-10">
          {!enabled ? (
            <p>{t("parity:planning.unavailable")}</p>
          ) : query.isPending ? (
            <p role="status">{t("parity:planning.loading")}</p>
          ) : query.error ? (
            <div role="alert">
              {query.error.message}
              <Button variant="ghost" onClick={() => query.refetch()}>
                {t("parity:planning.retry")}
              </Button>
            </div>
          ) : (
            project && (
              <>
                <header className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h1 className="text-2xl font-semibold tracking-tight">
                      {project.name}
                    </h1>
                    {canUpdateProjects() && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditing(true)}
                      >
                        {t("parity:planning.editProperties")}
                      </Button>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="rounded-md bg-muted px-2 py-1 text-xs">
                      {labels.status[project.status]}
                    </span>
                    <HealthBadge health={project.health} />
                  </div>
                  {project.description ? (
                    <MarkdownRenderer content={project.description} />
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      {t("parity:planning.noDescription")}
                    </p>
                  )}
                </header>
                <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_240px]">
                  <div className="min-w-0 space-y-9">
                    <Milestones
                      projectId={projectId}
                      milestones={project.milestones}
                      canUpdate={canUpdateProjects()}
                    />
                    <UpdateFeed
                      key={projectId}
                      parentType="project"
                      parentId={projectId}
                      canUpdate={canUpdateProjects()}
                      initialHealth={project.health}
                    />
                  </div>
                  <aside className="order-first space-y-7 lg:order-last">
                    <ProgressMeter progress={project.progress} />
                    <dl className="grid grid-cols-2 gap-x-4 gap-y-4 text-sm">
                      <dt className="text-muted-foreground">
                        {t("parity:planning.lead")}
                      </dt>
                      <dd>{project.leadName ?? t("parity:planning.noLead")}</dd>
                      <dt className="text-muted-foreground">
                        {t("parity:planning.startDate")}
                      </dt>
                      <dd>{date(project.startDate)}</dd>
                      <dt className="text-muted-foreground">
                        {t("parity:planning.targetDate")}
                      </dt>
                      <dd>{date(project.targetDate)}</dd>
                      <dt className="text-muted-foreground">
                        {t("parity:planning.priority")}
                      </dt>
                      <dd>{labels.priority[project.priority]}</dd>
                    </dl>
                  </aside>
                </div>
                {editing && (
                  <ProjectEditor
                    project={project}
                    onClose={() => setEditing(false)}
                  />
                )}
              </>
            )
          )}
        </div>
      </div>
    </ProjectLayout>
  );
}

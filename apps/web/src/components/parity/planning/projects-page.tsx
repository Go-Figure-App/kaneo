import { useInfiniteQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { TrialExpiredCallout } from "@/components/billing/trial-expired-callout";
import WorkspaceLayout from "@/components/common/workspace-layout";
import PageTitle from "@/components/page-title";
import CreateProjectModal from "@/components/shared/modals/create-project-modal";
import { Button } from "@/components/ui/button";
import { getProjectPlans } from "@/fetchers/parity/projects";
import { useCanImport } from "@/hooks/use-can-import";
import { useWorkspacePermission } from "@/hooks/use-workspace-permission";
import { projectStatuses, usePlanningLabels } from "./labels";
import { ProjectsTable } from "./projects-table";

export function PlanningProjectsPage({ workspaceId }: { workspaceId: string }) {
  const { t } = useTranslation();
  const labels = usePlanningLabels();
  const { canCreateProjects } = useWorkspacePermission();
  const { canImport } = useCanImport();
  const [creating, setCreating] = useState(false);
  const [grouped, setGrouped] = useState(true);
  const query = useInfiniteQuery({
    queryKey: ["parity", "project-plans", workspaceId],
    initialPageParam: 1,
    queryFn: ({ pageParam }) => getProjectPlans(workspaceId, pageParam),
    getNextPageParam: (page) => (page.hasMore ? page.page + 1 : undefined),
  });
  const projects = query.data?.pages.flatMap((page) => page.items) ?? [];
  return (
    <WorkspaceLayout
      title={t("parity:planning.projects")}
      headerActions={
        <>
          {canImport && (
            <Button
              variant="ghost"
              render={<Link to="/dashboard/settings/workspace/import" />}
            >
              {t("settings:workspaceImport.entry.projectsEmpty")}
            </Button>
          )}
          {canCreateProjects() && (
            <Button size="sm" onClick={() => setCreating(true)}>
              <Plus className="size-4" />
              {t("parity:planning.newProject")}
            </Button>
          )}
        </>
      }
    >
      <PageTitle title={t("parity:planning.projects")} />
      <TrialExpiredCallout workspaceId={workspaceId} className="m-4" />
      <div className="h-full overflow-auto px-4 py-5 sm:px-7">
        <label className="mb-5 flex items-center gap-2 text-xs text-muted-foreground">
          <input
            type="checkbox"
            checked={grouped}
            onChange={(event) => setGrouped(event.target.checked)}
          />
          {t("parity:planning.groupByStatus")}
        </label>
        {query.isPending && <p role="status">{t("parity:planning.loading")}</p>}
        {query.error && (
          <div role="alert">
            {query.error.message}
            <Button variant="ghost" onClick={() => query.refetch()}>
              {t("parity:planning.retry")}
            </Button>
          </div>
        )}
        {!query.isPending && !query.error && projects.length === 0 && (
          <p className="text-sm text-muted-foreground">
            {t("parity:planning.noProjects")}
          </p>
        )}
        {grouped ? (
          projectStatuses.map((status) => {
            const group = projects.filter(
              (project) => project.status === status,
            );
            return (
              group.length > 0 && (
                <section key={status} className="mb-7">
                  <h2 className="mb-2 text-xs font-medium">
                    {labels.status[status]}{" "}
                    <span className="ml-1 text-muted-foreground">
                      {group.length}
                    </span>
                  </h2>
                  <ProjectsTable projects={group} />
                </section>
              )
            );
          })
        ) : (
          <ProjectsTable projects={projects} />
        )}
        {query.hasNextPage && (
          <Button
            variant="outline"
            disabled={query.isFetchingNextPage}
            onClick={() => query.fetchNextPage()}
          >
            {t("parity:planning.loadMore")}
          </Button>
        )}
      </div>
      <CreateProjectModal
        open={creating}
        onClose={() => {
          setCreating(false);
          void query.refetch();
        }}
      />
    </WorkspaceLayout>
  );
}

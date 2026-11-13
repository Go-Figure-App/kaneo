import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { Plus, X } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import WorkspaceLayout from "@/components/common/workspace-layout";
import PageTitle from "@/components/page-title";
import { MarkdownRenderer } from "@/components/public-project/markdown-renderer";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  deleteInitiative,
  getInitiative,
  unlinkInitiativeProject,
  updateInitiative,
} from "@/fetchers/parity/initiatives";
import { useWorkspacePermission } from "@/hooks/use-workspace-permission";
import { formatDateMedium } from "@/lib/format";
import { HealthBadge } from "./health-badge";
import { InitiativeEditor } from "./initiative-editor";
import { usePlanningLabels } from "./labels";
import { LinkProjectDialog } from "./link-project-dialog";
import { ProgressMeter } from "./progress-meter";
import { refreshPlanning, usePlanningEnabled } from "./queries";
import { UpdateFeed } from "./update-feed";

export function InitiativeDetail({
  workspaceId,
  initiativeId,
}: {
  workspaceId: string;
  initiativeId: string;
}) {
  const { t } = useTranslation();
  const labels = usePlanningLabels();
  const client = useQueryClient();
  const navigate = useNavigate();
  const enabled = usePlanningEnabled("initiatives");
  const { canUpdateProjects, canManageSettings } = useWorkspacePermission();
  const [editing, setEditing] = useState(false);
  const [linking, setLinking] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const query = useQuery({
    queryKey: ["parity", "initiative", initiativeId, workspaceId],
    queryFn: () => getInitiative(initiativeId),
    enabled,
  });
  const initiative =
    !query.isError && query.data?.workspaceId === workspaceId
      ? query.data
      : undefined;
  const archive = useMutation({
    mutationKey: ["parity"],
    mutationFn: (archived: boolean) =>
      updateInitiative(initiativeId, { archived }),
    onSuccess: () => refreshPlanning(client),
  });
  const unlink = useMutation({
    mutationKey: ["parity"],
    mutationFn: (projectId: string) =>
      unlinkInitiativeProject(initiativeId, projectId),
    onSuccess: () => refreshPlanning(client),
  });
  const remove = useMutation({
    mutationKey: ["parity"],
    mutationFn: () => deleteInitiative(initiativeId),
    onSuccess: async () => {
      await refreshPlanning(client);
      await navigate({
        to: "/dashboard/workspace/$workspaceId/initiatives",
        params: { workspaceId },
      });
    },
  });
  return (
    <WorkspaceLayout
      title={initiative?.name ?? t("parity:planning.initiative")}
    >
      <PageTitle title={initiative?.name ?? t("parity:planning.initiative")} />
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
          ) : !initiative ? (
            <p role="alert">{t("parity:planning.noAccess")}</p>
          ) : (
            <>
              <header className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h1 className="text-2xl font-semibold tracking-tight">
                    {initiative.name}
                  </h1>
                  <div className="flex flex-wrap gap-2">
                    {canUpdateProjects() && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditing(true)}
                      >
                        {t("parity:planning.editProperties")}
                      </Button>
                    )}
                    {canManageSettings() && (
                      <>
                        {canUpdateProjects() && (
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={archive.isPending}
                            onClick={() =>
                              archive.mutate(!initiative.archivedAt)
                            }
                          >
                            {initiative.archivedAt
                              ? t("parity:planning.restore")
                              : t("parity:planning.archive")}
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeleting(true)}
                        >
                          {t("parity:planning.delete")}
                        </Button>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="rounded-md bg-muted px-2 py-1 text-xs">
                    {initiative.archivedAt
                      ? t("parity:planning.archived")
                      : labels.status[initiative.status]}
                  </span>
                  <HealthBadge health={initiative.health} />
                </div>
                {initiative.description ? (
                  <MarkdownRenderer content={initiative.description} />
                ) : (
                  <p className="text-sm text-muted-foreground">
                    {t("parity:planning.noDescription")}
                  </p>
                )}
              </header>
              {(archive.error || unlink.error) && (
                <p role="alert" className="text-sm text-destructive">
                  {archive.error?.message ?? unlink.error?.message}
                </p>
              )}
              <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_240px]">
                <div className="min-w-0 space-y-9">
                  <section className="space-y-4">
                    <div className="flex items-center justify-between gap-3">
                      <h2 className="text-sm font-semibold">
                        {t("parity:planning.linkedProjects")}
                      </h2>
                      {canUpdateProjects() && !initiative.archivedAt && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setLinking(true)}
                        >
                          <Plus className="size-3.5" />
                          {t("parity:planning.linkProject")}
                        </Button>
                      )}
                    </div>
                    {initiative.projects.length === 0 && (
                      <p className="text-sm text-muted-foreground">
                        {t("parity:planning.noProjects")}
                      </p>
                    )}
                    {initiative.projects.map((project) => (
                      <article
                        key={project.id}
                        className="space-y-4 rounded-xl border p-4"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="space-y-2">
                            <Link
                              className="text-sm font-medium hover:underline"
                              to="/dashboard/workspace/$workspaceId/project/$projectId/overview"
                              params={{ workspaceId, projectId: project.id }}
                            >
                              {project.name}
                            </Link>
                            <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                              <span>{labels.status[project.status]}</span>
                              <span>
                                {project.leadName ??
                                  t("parity:planning.noLead")}
                              </span>
                              <HealthBadge health={project.health} />
                            </div>
                          </div>
                          {canUpdateProjects() && !initiative.archivedAt && (
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label={t("parity:planning.unlinkProject")}
                              disabled={unlink.isPending}
                              onClick={() => unlink.mutate(project.id)}
                            >
                              <X className="size-4" />
                            </Button>
                          )}
                        </div>
                        <ProgressMeter progress={project.progress} />
                      </article>
                    ))}
                  </section>
                  <UpdateFeed
                    key={initiativeId}
                    parentType="initiative"
                    parentId={initiativeId}
                    canUpdate={canUpdateProjects() && !initiative.archivedAt}
                    initialHealth={initiative.health}
                  />
                </div>
                <aside className="order-first space-y-7 lg:order-last">
                  <ProgressMeter progress={initiative.progress} />
                  <dl className="grid grid-cols-2 gap-x-4 gap-y-4 text-sm">
                    <dt className="text-muted-foreground">
                      {t("parity:planning.owner")}
                    </dt>
                    <dd>
                      {initiative.ownerName ?? t("parity:planning.noOwner")}
                    </dd>
                    <dt className="text-muted-foreground">
                      {t("parity:planning.targetDate")}
                    </dt>
                    <dd>
                      {initiative.targetDate
                        ? formatDateMedium(
                            new Date(`${initiative.targetDate}T12:00:00`),
                          )
                        : t("parity:planning.noDate")}
                    </dd>
                  </dl>
                </aside>
              </div>
              {editing && (
                <InitiativeEditor
                  workspaceId={workspaceId}
                  initiative={initiative}
                  onClose={() => setEditing(false)}
                />
              )}
              {linking && (
                <LinkProjectDialog
                  workspaceId={workspaceId}
                  initiativeId={initiativeId}
                  linkedIds={initiative.projects.map((project) => project.id)}
                  onClose={() => setLinking(false)}
                />
              )}
              {deleting && (
                <Dialog
                  open
                  onOpenChange={(open) => {
                    if (!open) setDeleting(false);
                  }}
                >
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>
                        {t("parity:planning.deleteInitiative")}
                      </DialogTitle>
                    </DialogHeader>
                    <p className="text-sm">{initiative.name}</p>
                    {remove.error && <p role="alert">{remove.error.message}</p>}
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        onClick={() => setDeleting(false)}
                      >
                        {t("parity:planning.cancel")}
                      </Button>
                      <Button
                        variant="destructive"
                        disabled={remove.isPending}
                        onClick={() => remove.mutate()}
                      >
                        {t("parity:planning.confirmDelete")}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </>
          )}
        </div>
      </div>
    </WorkspaceLayout>
  );
}

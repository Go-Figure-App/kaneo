import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Inbox } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import WorkspaceLayout from "@/components/common/workspace-layout";
import PageTitle from "@/components/page-title";
import { InboxTask } from "@/components/inbox/inbox-task";
import { Button } from "@/components/ui/button";
import { getTriage } from "@/fetchers/parity/triage";
import useGetProjects from "@/hooks/queries/project/use-get-projects";
import { useWorkspacePermission } from "@/hooks/use-workspace-permission";
import { cn } from "@/lib/cn";
import { TriageActionBar } from "./action-bar";
import { NewTriageItem } from "./new-item";
import { useTriageEnabled } from "./queries";

export function TriageInbox({ workspaceId }: { workspaceId: string }) {
  const { t } = useTranslation();
  const enabled = useTriageEnabled();
  const { canCreateTasks } = useWorkspacePermission();
  const [projectId, setProjectId] = useState("");
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string>();
  const projects = useGetProjects({ workspaceId });
  const query = useQuery({
    queryKey: ["parity", "triage", workspaceId, projectId, page],
    queryFn: () => getTriage(workspaceId, projectId || undefined, page),
    enabled,
    refetchInterval: 30_000,
  });
  const selected = query.data?.items.find((item) => item.id === selectedId);
  return (
    <>
      <PageTitle title={t("parity:triage.title")} />
      <WorkspaceLayout title={t("parity:triage.title")}>
        {!enabled ? (
          <p className="p-6">{t("parity:triage.unavailable")}</p>
        ) : (
          <div className="flex h-full min-h-0 flex-col">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b p-4">
              <select
                aria-label={t("tasks:properties.project")}
                className="max-w-64 rounded-md border bg-background p-2 text-sm"
                value={projectId}
                onChange={(event) => {
                  setProjectId(event.target.value);
                  setPage(1);
                  setSelectedId(undefined);
                }}
              >
                <option value="">{t("workspace:home.projects.all")}</option>
                {projects.data?.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
              {canCreateTasks() && <NewTriageItem workspaceId={workspaceId} />}
            </div>
            <div className="flex min-h-0 flex-1">
              <div
                className={cn(
                  "flex w-full flex-col overflow-y-auto border-r lg:w-96 lg:shrink-0",
                  selected && "hidden lg:flex",
                )}
              >
                {query.isPending ? (
                  <p role="status" className="p-5">
                    {t("common:empty.loading")}
                  </p>
                ) : query.isError ? (
                  <div className="p-5">
                    <p role="alert">{query.error.message}</p>
                    <Button onClick={() => void query.refetch()}>
                      {t("common:error.tryAgain")}
                    </Button>
                  </div>
                ) : (
                  <>
                    {!query.data.items.length && (
                      <div className="p-8 text-center text-muted-foreground">
                        <Inbox className="mx-auto mb-3 size-6" />
                        {t("notifications:inbox.emptyFilter")}
                      </div>
                    )}
                    {query.data.items.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        aria-pressed={selectedId === item.id}
                        className={cn(
                          "border-b p-4 text-left hover:bg-accent",
                          selectedId === item.id && "bg-accent",
                        )}
                        onClick={() => setSelectedId(item.id)}
                      >
                        <span className="text-xs text-muted-foreground">
                          {item.projectSlug.toUpperCase()}-{item.number} ·{" "}
                          {item.projectName}
                        </span>
                        <span className="mt-1 block text-sm font-medium">
                          {item.title}
                        </span>
                      </button>
                    ))}
                    <div className="mt-auto flex items-center justify-between gap-2 p-4">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={page === 1}
                        onClick={() => {
                          setPage(page - 1);
                          setSelectedId(undefined);
                        }}
                      >
                        {t("common:pagination.previous")}
                      </Button>
                      <span className="text-xs tabular-nums">
                        {page} / {Math.max(1, Math.ceil(query.data.total / 50))}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={page * 50 >= query.data.total}
                        onClick={() => {
                          setPage(page + 1);
                          setSelectedId(undefined);
                        }}
                      >
                        {t("common:pagination.next")}
                      </Button>
                    </div>
                  </>
                )}
              </div>
              <div
                className={cn(
                  "min-w-0 flex-1 overflow-y-auto",
                  !selected && "hidden lg:block",
                )}
              >
                {selected ? (
                  <>
                    <Button
                      variant="ghost"
                      className="m-2 lg:hidden"
                      aria-label={t("common:pagination.previous")}
                      onClick={() => setSelectedId(undefined)}
                    >
                      <ArrowLeft />
                    </Button>
                    <TriageActionBar
                      key={selected.id}
                      item={selected}
                      workspaceId={workspaceId}
                    />
                    <div className="p-6">
                      <InboxTask
                        taskId={selected.id}
                        workspaceId={workspaceId}
                        showDescription
                      />
                    </div>
                  </>
                ) : (
                  <p className="flex h-full items-center justify-center text-sm text-muted-foreground">
                    {t("notifications:inbox.selectPrompt")}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </WorkspaceLayout>
    </>
  );
}

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { deleteTemplate, type TaskTemplate } from "@/fetchers/parity/views";
import { useWorkspacePermission } from "@/hooks/use-workspace-permission";
import { refreshViews, useTemplates } from "./queries";
import { TemplateEditor } from "./template-editor";
export function TemplateList({
  workspaceId,
  projectId,
}: {
  workspaceId: string;
  projectId: string;
}) {
  const { t } = useTranslation();
  const query = useTemplates(projectId);
  const client = useQueryClient();
  const { canUpdateProjects } = useWorkspacePermission();
  const [editing, setEditing] = useState<TaskTemplate | "new">();
  const items = query.isError
    ? []
    : [
        ...new Map(
          query.data?.pages
            .flatMap((page) => page.items)
            .map((item) => [item.name, item]),
        ).values(),
      ];
  const remove = useMutation({
    mutationKey: ["parity"],
    mutationFn: (name: string) => deleteTemplate(projectId, name),
    onSettled: () => refreshViews(client),
  });
  return (
    <div className="space-y-4">
      {canUpdateProjects() && (
        <Button size="sm" onClick={() => setEditing("new")}>
          {t("parity:views.newTemplate")}
        </Button>
      )}
      {query.isPending && <p role="status">{t("parity:planning.loading")}</p>}
      {query.error && (
        <div role="alert">
          {query.error.message}
          <Button variant="ghost" onClick={() => query.refetch()}>
            {t("parity:planning.retry")}
          </Button>
        </div>
      )}
      {remove.error && <p role="alert">{remove.error.message}</p>}
      {!query.isPending && !query.error && !items.length && (
        <p className="text-sm text-muted-foreground">
          {t("parity:views.noTemplates")}
        </p>
      )}
      <div className="divide-y rounded-lg border empty:hidden">
        {items.map((template) => (
          <article
            key={template.name}
            className="flex items-center justify-between gap-4 p-4"
          >
            <div className="min-w-0">
              <h2 className="truncate text-sm font-medium">{template.name}</h2>
              <p className="truncate text-xs text-muted-foreground">
                {template.title}
              </p>
            </div>
            {canUpdateProjects() && (
              <div className="flex gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setEditing(template)}
                >
                  {t("parity:views.editTemplate")}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={remove.isPending}
                  onClick={() => {
                    if (window.confirm(t("parity:views.deleteTemplateConfirm")))
                      remove.mutate(template.name);
                  }}
                >
                  {t("parity:planning.delete")}
                </Button>
              </div>
            )}
          </article>
        ))}
      </div>
      {!query.error && query.hasNextPage && (
        <Button
          variant="outline"
          disabled={query.isFetchingNextPage}
          onClick={() => query.fetchNextPage()}
        >
          {t("parity:views.more")}
        </Button>
      )}
      {editing && (
        <TemplateEditor
          workspaceId={workspaceId}
          projectId={projectId}
          template={editing === "new" ? undefined : editing}
          onClose={() => setEditing(undefined)}
        />
      )}
    </div>
  );
}

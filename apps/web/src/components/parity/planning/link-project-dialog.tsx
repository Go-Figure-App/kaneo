import { uniquePageItems } from "./unique-page-items";
import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { linkInitiativeProject } from "@/fetchers/parity/initiatives";
import { getProjectPlans } from "@/fetchers/parity/projects";
import { refreshPlanning } from "./queries";

export function LinkProjectDialog({
  workspaceId,
  initiativeId,
  linkedIds,
  onClose,
}: {
  workspaceId: string;
  initiativeId: string;
  linkedIds: string[];
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const client = useQueryClient();
  const [selected, setSelected] = useState("");
  const query = useInfiniteQuery({
    queryKey: ["parity", "project-plans", workspaceId],
    initialPageParam: 1,
    queryFn: ({ pageParam }) => getProjectPlans(workspaceId, pageParam),
    getNextPageParam: (page) => (page.hasMore ? page.page + 1 : undefined),
  });
  const mutation = useMutation({
    mutationFn: () => linkInitiativeProject(initiativeId, selected),
    onSuccess: async () => {
      await refreshPlanning(client);
      onClose();
    },
  });
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("parity:planning.linkProject")}</DialogTitle>
        </DialogHeader>
        <label className="grid gap-2 text-sm">
          {t("parity:planning.projects")}
          <select
            value={selected}
            disabled={mutation.isPending}
            onChange={(event) => setSelected(event.target.value)}
            className="rounded-md border bg-background p-2"
          >
            <option value="">{t("parity:planning.chooseProject")}</option>
            {(query.isError ? [] : uniquePageItems(query.data?.pages))
              .filter((project) => !linkedIds.includes(project.id))
              .map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
          </select>
        </label>
        {query.isPending && <p role="status">{t("parity:planning.loading")}</p>}
        {!query.isError && query.hasNextPage && (
          <Button
            variant="ghost"
            disabled={query.isFetchingNextPage}
            onClick={() => query.fetchNextPage()}
          >
            {t("parity:planning.loadMore")}
          </Button>
        )}
        {(query.error || mutation.error) && (
          <p role="alert" className="text-sm text-destructive">
            {query.error?.message ?? mutation.error?.message}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            {t("parity:planning.cancel")}
          </Button>
          <Button
            disabled={!selected || query.isError || mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            {t("parity:planning.linkProject")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

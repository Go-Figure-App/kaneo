import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { saveView, type SavedViewInput } from "@/fetchers/parity/views";
import { useWorkspacePermission } from "@/hooks/use-workspace-permission";
import { refreshViews, useViewOptions } from "./queries";

export function SaveViewDialog({
  workspaceId,
  initial,
  id,
  onClose,
  onSaved,
}: {
  workspaceId: string;
  initial: SavedViewInput;
  id?: string;
  onClose: () => void;
  onSaved: (id: string) => void;
}) {
  const { t } = useTranslation();
  const client = useQueryClient();
  const options = useViewOptions(workspaceId);
  const { canUpdateProjects } = useWorkspacePermission();
  const [draft, setDraft] = useState(initial);
  const mutation = useMutation({
    mutationKey: ["parity"],
    mutationFn: () => saveView(workspaceId, draft, id),
    onSuccess: async (result) => {
      await refreshViews(client);
      onSaved(result.id);
      onClose();
    },
  });
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !mutation.isPending) onClose();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {t(id ? "parity:views.edit" : "parity:views.newView")}
          </DialogTitle>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            mutation.mutate();
          }}
        >
          <label className="grid gap-1.5 text-sm">
            {t("parity:views.name")}
            <input
              autoFocus
              required
              maxLength={200}
              className="rounded-md border bg-background p-2"
              value={draft.name}
              onChange={(event) =>
                setDraft({ ...draft, name: event.target.value })
              }
            />
          </label>
          <label className="grid gap-1.5 text-sm">
            {t("parity:views.icon")}
            <input
              maxLength={100}
              className="rounded-md border bg-background p-2"
              value={draft.icon ?? ""}
              onChange={(event) =>
                setDraft({ ...draft, icon: event.target.value || null })
              }
            />
          </label>
          <label className="grid gap-1.5 text-sm">
            {t("parity:views.filters.project")}
            <select
              className="rounded-md border bg-background p-2"
              disabled={options.isPending || options.isError}
              value={draft.projectId ?? ""}
              onChange={(event) =>
                setDraft({ ...draft, projectId: event.target.value || null })
              }
            >
              <option value="">{t("parity:views.workspace")}</option>
              {draft.projectId &&
                !options.data?.projects.some(
                  (project) => project.id === draft.projectId,
                ) && (
                  <option value={draft.projectId}>
                    {t("parity:views.unknown")}
                  </option>
                )}
              {!options.isError &&
                options.data?.projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
            </select>
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={draft.shared ?? false}
              disabled={!canUpdateProjects()}
              onChange={(event) =>
                setDraft({ ...draft, shared: event.target.checked })
              }
            />
            {t("parity:views.shared")}
          </label>
          {(mutation.error || options.error) && (
            <p role="alert" className="text-sm text-destructive">
              {mutation.error?.message ?? options.error?.message}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              disabled={mutation.isPending}
              onClick={onClose}
            >
              {t("parity:planning.cancel")}
            </Button>
            <Button
              type="submit"
              disabled={
                mutation.isPending ||
                !draft.name.trim() ||
                Boolean(draft.shared && !canUpdateProjects())
              }
            >
              {t("parity:planning.save")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import CommentEditor from "@/components/activity/comment-editor";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  saveTemplate,
  type TaskTemplate,
  type TemplateInput,
} from "@/fetchers/parity/views";
import { refreshViews } from "./queries";
import { TemplateDefaults } from "./template-defaults";
export function TemplateEditor({
  workspaceId,
  projectId,
  template,
  onClose,
}: {
  workspaceId: string;
  projectId: string;
  template?: TaskTemplate;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const client = useQueryClient();
  const [draft, setDraft] = useState<TemplateInput>(
    template
      ? {
          name: template.name,
          title: template.title,
          description: template.description,
          defaults: template.defaults,
        }
      : {
          name: "",
          title: "",
          description: "",
          defaults: {
            priority: "no-priority",
            assigneeId: null,
            labels: [],
            estimate: null,
          },
        },
  );
  const mutation = useMutation({
    mutationKey: ["parity"],
    mutationFn: () => saveTemplate(projectId, draft, template?.name),
    onSuccess: async () => {
      await refreshViews(client);
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
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {t(
              template
                ? "parity:views.editTemplate"
                : "parity:views.newTemplate",
            )}
          </DialogTitle>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            mutation.mutate();
          }}
        >
          <label className="grid gap-1 text-sm">
            {t("parity:views.templateName")}
            <input
              autoFocus
              required
              maxLength={200}
              value={draft.name}
              onChange={(event) =>
                setDraft({ ...draft, name: event.target.value })
              }
              className="rounded-md border bg-background p-2"
            />
          </label>
          <label className="grid gap-1 text-sm">
            {t("parity:views.templateTitle")}
            <input
              maxLength={500}
              value={draft.title}
              onChange={(event) =>
                setDraft({ ...draft, title: event.target.value })
              }
              className="rounded-md border bg-background p-2"
            />
          </label>
          <div className="space-y-1 text-sm">
            <p>{t("parity:views.templateDescription")}</p>
            <CommentEditor
              showQuickAttachButton={false}
              value={draft.description}
              onChange={(description) => setDraft({ ...draft, description })}
              placeholder={t("parity:views.templateDescription")}
            />
          </div>
          <TemplateDefaults
            workspaceId={workspaceId}
            projectId={projectId}
            value={draft.defaults}
            onChange={(defaults) => setDraft({ ...draft, defaults })}
          />
          {mutation.error && (
            <p role="alert" className="text-sm text-destructive">
              {mutation.error.message}
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
              disabled={mutation.isPending || !draft.name.trim()}
            >
              {t("parity:planning.save")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

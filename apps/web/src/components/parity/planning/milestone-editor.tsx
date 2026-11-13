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
  createMilestone,
  updateMilestone,
  type Milestone,
} from "@/fetchers/parity/projects";
import { refreshPlanning } from "./queries";

export function MilestoneEditor({
  projectId,
  milestone,
  onClose,
}: {
  projectId: string;
  milestone?: Milestone;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const client = useQueryClient();
  const [description, setDescription] = useState(milestone?.description ?? "");
  const mutation = useMutation({
    mutationFn: (form: FormData) => {
      const input = {
        name: String(form.get("name")),
        description,
        targetDate: String(form.get("targetDate") ?? "") || null,
      };
      return milestone
        ? updateMilestone(milestone.id, input)
        : createMilestone(projectId, input);
    },
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
          <DialogTitle>
            {milestone
              ? t("parity:planning.edit")
              : t("parity:planning.newMilestone")}
          </DialogTitle>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            mutation.mutate(new FormData(event.currentTarget));
          }}
        >
          <label className="grid gap-1.5 text-sm">
            {t("parity:planning.name")}
            <input
              name="name"
              required
              maxLength={200}
              defaultValue={milestone?.name ?? ""}
              className="rounded-md border bg-background p-2"
            />
          </label>
          <label className="grid gap-1.5 text-sm">
            {t("parity:planning.targetDate")}
            <input
              name="targetDate"
              type="date"
              defaultValue={milestone?.targetDate ?? ""}
              className="rounded-md border bg-background p-2"
            />
          </label>
          <div className="space-y-1.5">
            <p className="text-sm">{t("parity:planning.description")}</p>
            <CommentEditor
              showQuickAttachButton={false}
              value={description}
              onChange={setDescription}
              placeholder={t("parity:planning.description")}
            />
          </div>
          {mutation.error && (
            <p role="alert" className="text-sm text-destructive">
              {mutation.error.message}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              {t("parity:planning.cancel")}
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {t("parity:planning.save")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

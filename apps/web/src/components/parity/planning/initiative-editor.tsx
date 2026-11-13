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
  createInitiative,
  updateInitiative,
  type Initiative,
} from "@/fetchers/parity/initiatives";
import useGetWorkspaceUsers from "@/hooks/queries/workspace-users/use-get-workspace-users";
import { initiativeStatuses, usePlanningLabels } from "./labels";
import { refreshPlanning } from "./queries";

export function InitiativeEditor({
  workspaceId,
  initiative,
  onClose,
  onCreated,
}: {
  workspaceId: string;
  initiative?: Initiative;
  onClose: () => void;
  onCreated?: (id: string) => void;
}) {
  const { t } = useTranslation();
  const labels = usePlanningLabels();
  const client = useQueryClient();
  const members = useGetWorkspaceUsers({ workspaceId });
  const [description, setDescription] = useState(initiative?.description ?? "");
  const [selectedOwnerId, setOwnerId] = useState<string>();
  const ownerId = selectedOwnerId ?? initiative?.ownerId ?? "";
  const mutation = useMutation({
    mutationFn: (form: FormData) => {
      const input = {
        name: String(form.get("name")),
        description,
        status: String(form.get("status")) as Initiative["status"],
        ...(!initiative || selectedOwnerId !== undefined
          ? { ownerId: ownerId || null }
          : {}),
        targetDate: String(form.get("targetDate") ?? "") || null,
      };
      return initiative
        ? updateInitiative(initiative.id, input)
        : createInitiative(workspaceId, input);
    },
    onSuccess: async (result) => {
      await refreshPlanning(client);
      onClose();
      if (!initiative) onCreated?.(result.id);
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
            {initiative
              ? t("parity:planning.editProperties")
              : t("parity:planning.newInitiative")}
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
              defaultValue={initiative?.name ?? ""}
              className="rounded-md border bg-background p-2"
            />
          </label>
          <label className="grid gap-1.5 text-sm">
            {t("parity:planning.status")}
            <select
              name="status"
              defaultValue={initiative?.status ?? "planned"}
              className="rounded-md border bg-background p-2"
            >
              {initiativeStatuses.map((status) => (
                <option key={status} value={status}>
                  {labels.status[status]}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1.5 text-sm">
            {t("parity:planning.owner")}
            <select
              name="ownerId"
              value={ownerId}
              onChange={(event) => setOwnerId(event.target.value)}
              className="rounded-md border bg-background p-2"
              disabled={members.isPending || Boolean(members.error)}
            >
              <option value="">{t("parity:planning.noOwner")}</option>
              {initiative?.ownerId &&
                !members.data?.some(
                  (member) => member.user.id === initiative.ownerId,
                ) && (
                  <option value={initiative.ownerId}>
                    {initiative.ownerName ?? t("parity:planning.deletedUser")}
                  </option>
                )}
              {members.data?.map((member) => (
                <option key={member.user.id} value={member.user.id}>
                  {member.user.name}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1.5 text-sm">
            {t("parity:planning.targetDate")}
            <input
              name="targetDate"
              type="date"
              defaultValue={initiative?.targetDate ?? ""}
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
          {(mutation.error || members.error) && (
            <p role="alert" className="text-sm text-destructive">
              {mutation.error?.message ?? members.error?.message}
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

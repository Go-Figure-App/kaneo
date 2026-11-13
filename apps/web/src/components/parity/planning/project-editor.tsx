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
import {
  updateProjectPlan,
  type ProjectPlan,
} from "@/fetchers/parity/projects";
import useGetProjectMembers from "@/hooks/queries/workspace-users/use-get-project-members";
import { priorities, projectStatuses, usePlanningLabels } from "./labels";
import { refreshPlanning } from "./queries";

export function ProjectEditor({
  project,
  onClose,
}: {
  project: ProjectPlan;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const labels = usePlanningLabels();
  const client = useQueryClient();
  const [leadId, setLeadId] = useState(project.leadId ?? "");
  const members = useGetProjectMembers({
    workspaceId: project.workspaceId,
    projectId: project.id,
  });
  const mutation = useMutation({
    mutationFn: (form: FormData) =>
      updateProjectPlan(project.id, {
        status: String(form.get("status")) as ProjectPlan["status"],
        priority: String(form.get("priority")) as ProjectPlan["priority"],
        ...(leadId !== (project.leadId ?? "")
          ? { leadId: leadId || null }
          : {}),
        startDate: String(form.get("startDate") ?? "") || null,
        targetDate: String(form.get("targetDate") ?? "") || null,
      }),
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
          <DialogTitle>{t("parity:planning.editProperties")}</DialogTitle>
        </DialogHeader>
        <form
          className="grid gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            mutation.mutate(new FormData(event.currentTarget));
          }}
        >
          <label className="grid gap-1.5 text-sm">
            {t("parity:planning.status")}
            <select
              name="status"
              defaultValue={project.status}
              className="rounded-md border bg-background p-2"
            >
              {projectStatuses.map((status) => (
                <option key={status} value={status}>
                  {labels.status[status]}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1.5 text-sm">
            {t("parity:planning.lead")}
            <select
              name="leadId"
              value={leadId}
              onChange={(event) => setLeadId(event.target.value)}
              className="rounded-md border bg-background p-2"
              disabled={members.isPending || Boolean(members.error)}
            >
              <option value="">{t("parity:planning.noLead")}</option>
              {project.leadId &&
                !members.data?.some(
                  (member) => member.id === project.leadId,
                ) && (
                  <option value={project.leadId}>
                    {project.leadName ?? t("parity:planning.deletedUser")}
                  </option>
                )}
              {members.data?.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name}
                </option>
              ))}
            </select>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="grid gap-1.5 text-sm">
              {t("parity:planning.startDate")}
              <input
                type="date"
                name="startDate"
                defaultValue={project.startDate ?? ""}
                className="min-w-0 rounded-md border bg-background p-2"
              />
            </label>
            <label className="grid gap-1.5 text-sm">
              {t("parity:planning.targetDate")}
              <input
                type="date"
                name="targetDate"
                defaultValue={project.targetDate ?? ""}
                className="min-w-0 rounded-md border bg-background p-2"
              />
            </label>
          </div>
          <label className="grid gap-1.5 text-sm">
            {t("parity:planning.priority")}
            <select
              name="priority"
              defaultValue={project.priority}
              className="rounded-md border bg-background p-2"
            >
              {priorities.map((value) => (
                <option key={value} value={value}>
                  {labels.priority[value]}
                </option>
              ))}
            </select>
          </label>
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

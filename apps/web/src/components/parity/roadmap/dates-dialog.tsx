import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { updateProjectPlan } from "@/fetchers/parity/projects";
import type { RoadmapProject } from "@/fetchers/parity/roadmap";
import { refreshPlanning } from "../planning/queries";

export function DatesDialog({
  project,
  onClose,
}: {
  project: RoadmapProject;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const client = useQueryClient();
  const mutation = useMutation({
    mutationKey: ["parity"],
    mutationFn: (form: FormData) =>
      updateProjectPlan(project.id, {
        startDate: String(form.get("startDate")) || null,
        targetDate: String(form.get("targetDate")) || null,
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
          <DialogTitle>
            {t("parity:roadmap.editDates", { name: project.name })}
          </DialogTitle>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            mutation.mutate(new FormData(event.currentTarget));
          }}
        >
          <label className="grid gap-2 text-sm">
            {t("parity:planning.startDate")}
            <input
              type="date"
              name="startDate"
              min="0001-01-01"
              max="9999-12-31"
              defaultValue={project.startDate ?? ""}
              className="rounded-md border bg-background p-2"
            />
          </label>
          <label className="grid gap-2 text-sm">
            {t("parity:planning.targetDate")}
            <input
              type="date"
              name="targetDate"
              min="0001-01-01"
              max="9999-12-31"
              defaultValue={project.targetDate ?? ""}
              className="rounded-md border bg-background p-2"
            />
          </label>
          {mutation.error && <p role="alert">{mutation.error.message}</p>}
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

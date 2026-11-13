import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { MarkdownRenderer } from "@/components/public-project/markdown-renderer";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  deleteMilestone,
  updateMilestone,
  type Milestone,
} from "@/fetchers/parity/projects";
import { formatDateMedium } from "@/lib/format";
import { MilestoneEditor } from "./milestone-editor";
import { ProgressMeter } from "./progress-meter";
import { refreshPlanning } from "./queries";

export function Milestones({
  projectId,
  milestones,
  canUpdate,
}: {
  projectId: string;
  milestones: Milestone[];
  canUpdate: boolean;
}) {
  const { t } = useTranslation();
  const client = useQueryClient();
  const [editing, setEditing] = useState<Milestone | "new" | null>(null);
  const [deleting, setDeleting] = useState<Milestone | null>(null);
  const remove = useMutation({
    mutationKey: ["parity"],
    mutationFn: deleteMilestone,
    onSuccess: async () => {
      setDeleting(null);
      await refreshPlanning(client);
    },
  });
  const reorder = useMutation({
    mutationKey: ["parity"],
    mutationFn: async ({
      index,
      offset,
    }: {
      index: number;
      offset: number;
    }) => {
      const next = [...milestones];
      [next[index], next[index + offset]] = [next[index + offset], next[index]];
      // Explicit positions also normalize ties left by an earlier interrupted edit.
      for (const [position, milestone] of next.entries())
        if (milestone.position !== position)
          await updateMilestone(milestone.id, { position });
    },
    onSettled: () => refreshPlanning(client),
  });
  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold">
          {t("parity:planning.milestones")}
        </h2>
        {canUpdate && (
          <Button size="sm" variant="ghost" onClick={() => setEditing("new")}>
            <Plus className="size-3.5" />
            {t("parity:planning.newMilestone")}
          </Button>
        )}
      </div>
      {milestones.length === 0 && (
        <p className="text-sm text-muted-foreground">
          {t("parity:planning.noMilestones")}
        </p>
      )}
      {reorder.error && (
        <p role="alert" className="text-sm text-destructive">
          {reorder.error.message}
        </p>
      )}
      {milestones.map((milestone, index) => (
        <article key={milestone.id} className="space-y-3 rounded-xl border p-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-medium">{milestone.name}</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                {milestone.targetDate
                  ? formatDateMedium(
                      new Date(`${milestone.targetDate}T12:00:00`),
                    )
                  : t("parity:planning.noDate")}
              </p>
            </div>
            {canUpdate && (
              <div className="flex shrink-0 gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={t("parity:planning.moveUp")}
                  disabled={index === 0 || reorder.isPending}
                  onClick={() => reorder.mutate({ index, offset: -1 })}
                >
                  <ArrowUp className="size-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={t("parity:planning.moveDown")}
                  disabled={
                    index === milestones.length - 1 || reorder.isPending
                  }
                  onClick={() => reorder.mutate({ index, offset: 1 })}
                >
                  <ArrowDown className="size-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={t("parity:planning.edit")}
                  onClick={() => setEditing(milestone)}
                >
                  <Pencil className="size-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={t("parity:planning.delete")}
                  onClick={() => setDeleting(milestone)}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            )}
          </div>
          {milestone.description && (
            <MarkdownRenderer content={milestone.description} />
          )}
          <ProgressMeter progress={milestone.progress} />
        </article>
      ))}
      {editing && (
        <MilestoneEditor
          projectId={projectId}
          milestone={editing === "new" ? undefined : editing}
          onClose={() => setEditing(null)}
        />
      )}
      {deleting && (
        <Dialog
          open
          onOpenChange={(open) => {
            if (!open) setDeleting(null);
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("parity:planning.deleteMilestone")}</DialogTitle>
            </DialogHeader>
            <p className="text-sm">{deleting.name}</p>
            {remove.error && <p role="alert">{remove.error.message}</p>}
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setDeleting(null)}>
                {t("parity:planning.cancel")}
              </Button>
              <Button
                variant="destructive"
                disabled={remove.isPending}
                onClick={() => remove.mutate(deleting.id)}
              >
                {t("parity:planning.confirmDelete")}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </section>
  );
}

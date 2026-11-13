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
  updateCycle,
  type CycleDetail,
  type CycleEdit,
} from "@/fetchers/parity/cycles";
import { useWorkspacePermission } from "@/hooks/use-workspace-permission";
import { refreshPlanning } from "../planning/queries";
import { calendarDay } from "./chart";

function shiftDay(day: string, offset: number) {
  return new Date(Date.parse(`${day}T00:00:00Z`) + offset * 86_400_000)
    .toISOString()
    .slice(0, 10);
}
export function CycleEditor({
  cycle,
  onClose,
}: {
  cycle: CycleDetail;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const client = useQueryClient();
  const { canUpdateProjects } = useWorkspacePermission();
  const [draft, setDraft] = useState<CycleEdit>({});
  const mutation = useMutation({
    mutationKey: ["parity"],
    mutationFn: () => updateCycle(cycle.id, draft),
    onSuccess: async () => {
      await refreshPlanning(client);
      onClose();
    },
  });
  const start =
    draft.startDate ?? calendarDay(cycle.startsAt, cycle.settings.timeZone);
  const end = draft.endDate
    ? shiftDay(draft.endDate, -1)
    : calendarDay(
        new Date(+new Date(cycle.endsAt) - 1),
        cycle.settings.timeZone,
      );
  const field = "mt-1 h-9 w-full rounded-md border bg-background px-3 text-sm";
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !mutation.isPending) onClose();
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("parity:cycles.edit")}</DialogTitle>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (canUpdateProjects() && !mutation.isPending) mutation.mutate();
          }}
        >
          <fieldset
            disabled={mutation.isPending || !canUpdateProjects()}
            className="space-y-4"
          >
            <label className="block text-xs font-medium">
              {t("parity:cycles.name")}
              <input
                className={field}
                maxLength={200}
                value={
                  draft.name === undefined
                    ? (cycle.name ?? "")
                    : (draft.name ?? "")
                }
                placeholder={t("parity:cycles.number", {
                  number: cycle.number,
                })}
                onChange={(event) =>
                  setDraft({ ...draft, name: event.target.value || null })
                }
              />
            </label>
            {cycle.phase === "upcoming" && (
              <div className="grid grid-cols-2 gap-4">
                <label className="text-xs font-medium">
                  {t("parity:cycles.startDate")}
                  <input
                    required
                    type="date"
                    className={field}
                    value={start}
                    onChange={(event) =>
                      setDraft({ ...draft, startDate: event.target.value })
                    }
                  />
                </label>
                <label className="text-xs font-medium">
                  {t("parity:cycles.endDate")}
                  <input
                    required
                    type="date"
                    min={start}
                    max="9999-12-30"
                    className={field}
                    value={end}
                    onChange={(event) => {
                      if (event.target.value)
                        setDraft({
                          ...draft,
                          endDate: shiftDay(event.target.value, 1),
                        });
                    }}
                  />
                </label>
              </div>
            )}
          </fieldset>
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
              disabled={mutation.isPending || !canUpdateProjects()}
            >
              {t("parity:planning.save")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

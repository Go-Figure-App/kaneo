import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  bulkUpdatePlanningTasks,
  getCycleSettings,
  type BulkPlanningChange,
} from "@/fetchers/parity/cycles";
import { getMilestones } from "@/fetchers/parity/projects";
import { useWorkspacePermission } from "@/hooks/use-workspace-permission";
import { refreshPlanning } from "../planning/queries";
import { estimateChoices, estimateLabel } from "./estimates";
import { useCycleOptions } from "./queries";

export function BulkPlanningDialog({
  taskIds,
  projectId,
  workspaceId,
  cycles,
  projects,
  onClose,
  onSuccess,
}: {
  taskIds: string[];
  projectId: string;
  workspaceId: string;
  cycles: boolean;
  projects: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { t, i18n } = useTranslation();
  const client = useQueryClient();
  const { canUpdateTasks } = useWorkspacePermission();
  const [operation, setOperation] = useState<BulkPlanningChange["operation"]>(
    cycles ? "updateCycle" : "updateMilestone",
  );
  const [value, setValue] = useState("choose");
  const settings = useQuery({
    queryKey: ["parity", "cycle-settings", workspaceId],
    queryFn: () => getCycleSettings(workspaceId),
    enabled: cycles,
  });
  const options = useCycleOptions(
    workspaceId,
    cycles &&
      operation === "updateCycle" &&
      Boolean(settings.data?.cyclesEnabled),
  );
  const milestones = useQuery({
    queryKey: ["parity", "milestones", projectId],
    queryFn: () => getMilestones(projectId),
    enabled: projects && operation === "updateMilestone",
  });
  const mutation = useMutation({
    mutationKey: ["parity"],
    mutationFn: bulkUpdatePlanningTasks,
    onSuccess: async () => {
      await refreshPlanning(client);
      onSuccess();
      onClose();
    },
  });
  const relevant = operation === "updateMilestone" ? milestones : settings;
  const error =
    relevant.error ??
    (operation === "updateCycle" && settings.data?.cyclesEnabled
      ? options.error
      : null);
  const waiting =
    relevant.isPending ||
    (operation === "updateCycle" &&
      settings.data?.cyclesEnabled &&
      options.isPending);
  const limit = taskIds.length === 0 || taskIds.length > 100;
  const disabled =
    mutation.isPending ||
    !canUpdateTasks() ||
    limit ||
    waiting ||
    Boolean(error);
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
          <DialogTitle>{t("parity:cycles.bulkPlanning")}</DialogTitle>
          <DialogDescription>
            {t("parity:cycles.bulkDescription", { count: taskIds.length })}
          </DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (disabled || value === "choose") return;
            const base = { taskIds };
            mutation.mutate(
              operation === "updateEstimate"
                ? {
                    ...base,
                    operation,
                    value: value === "none" ? null : Number(value),
                  }
                : {
                    ...base,
                    operation,
                    value: value === "none" ? null : value,
                  },
            );
          }}
        >
          <label className="block text-xs">
            {t("parity:cycles.property")}
            <select
              className={field}
              value={operation}
              disabled={mutation.isPending}
              onChange={(event) => {
                setOperation(
                  event.target.value as BulkPlanningChange["operation"],
                );
                setValue("choose");
              }}
            >
              {cycles && (
                <>
                  <option value="updateCycle">
                    {t("parity:cycles.cycle")}
                  </option>
                  <option value="updateEstimate">
                    {t("parity:cycles.estimate")}
                  </option>
                </>
              )}
              {projects && (
                <option value="updateMilestone">
                  {t("parity:planning.milestone")}
                </option>
              )}
            </select>
          </label>
          <label className="block text-xs">
            {t("parity:cycles.value")}
            <select
              className={field}
              value={value}
              disabled={disabled}
              onChange={(event) => setValue(event.target.value)}
            >
              <option value="choose" disabled>
                {t("parity:cycles.chooseValue")}
              </option>
              <option value="none">
                {operation === "updateCycle"
                  ? t("parity:cycles.noCycle")
                  : operation === "updateEstimate"
                    ? t("parity:cycles.noEstimate")
                    : t("parity:planning.noMilestone")}
              </option>
              {operation === "updateCycle" &&
                settings.data?.cyclesEnabled &&
                options.items.map((cycle) => (
                  <option key={cycle.id} value={cycle.id}>
                    {cycle.name ??
                      t("parity:cycles.number", { number: cycle.number })}
                  </option>
                ))}
              {operation === "updateEstimate" &&
                estimateChoices(settings.data?.estimateScale ?? "none").map(
                  (estimate) => (
                    <option key={estimate} value={estimate}>
                      {estimateLabel(
                        estimate,
                        settings.data?.estimateScale ?? "none",
                        i18n.language,
                      )}
                    </option>
                  ),
                )}
              {operation === "updateMilestone" &&
                !milestones.error &&
                milestones.data?.map((milestone) => (
                  <option key={milestone.id} value={milestone.id}>
                    {milestone.name}
                  </option>
                ))}
            </select>
          </label>
          {operation === "updateCycle" &&
            settings.data?.cyclesEnabled &&
            options.hasNextPage && (
              <Button
                type="button"
                variant="ghost"
                disabled={options.isFetchingNextPage || mutation.isPending}
                onClick={() => void options.fetchNextPage()}
              >
                {t("parity:cycles.loadMore")}
              </Button>
            )}
          {limit && (
            <p role="alert" className="text-sm text-destructive">
              {t("parity:cycles.bulkLimit")}
            </p>
          )}
          {waiting && (
            <p role="status" className="text-xs">
              {t("parity:planning.loading")}
            </p>
          )}
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error.message}
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  void relevant.refetch();
                  if (
                    operation === "updateCycle" &&
                    settings.data?.cyclesEnabled
                  )
                    void options.refetch();
                }}
              >
                {t("parity:cycles.retry")}
              </Button>
            </p>
          )}
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
            <Button type="submit" disabled={disabled || value === "choose"}>
              {t("parity:planning.save")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

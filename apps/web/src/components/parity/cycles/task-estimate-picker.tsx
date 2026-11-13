import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Diamond } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { OptionMenu } from "@/components/common/option-menu/option-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { updateTaskEstimate } from "@/fetchers/parity/cycles";
import { useWorkspacePermission } from "@/hooks/use-workspace-permission";
import { refreshPlanning } from "../planning/queries";
import { estimateChoices, estimateLabel } from "./estimates";
import { useTaskCycles } from "./queries";
import { useEstimateShortcut } from "./shortcuts";

export function TaskEstimatePicker({
  taskId,
  projectId,
}: {
  taskId: string;
  projectId: string;
}) {
  const { t, i18n } = useTranslation();
  const client = useQueryClient();
  const current = useTaskCycles(taskId, projectId);
  const { canUpdateTasks } = useWorkspacePermission();
  useEstimateShortcut(
    current.enabled &&
      canUpdateTasks() &&
      Boolean(current.data) &&
      (current.data?.estimateScale !== "none" ||
        current.data?.estimate !== null),
  );
  const [open, setOpen] = useState(false);
  const mutation = useMutation({
    mutationKey: ["parity"],
    mutationFn: (estimate: number | null) =>
      updateTaskEstimate(taskId, estimate),
    onSuccess: async () => {
      setOpen(false);
      await refreshPlanning(client);
    },
  });
  if (
    !current.enabled ||
    (current.data?.estimateScale === "none" && current.data.estimate === null)
  )
    return null;
  if (current.error)
    return (
      <p role="alert" className="text-xs text-destructive">
        {current.error.message}{" "}
        <button type="button" onClick={() => void current.refetch()}>
          {t("parity:planning.retry")}
        </button>
      </p>
    );
  const scale = current.data?.estimateScale ?? "none";
  const value = current.data?.estimate;
  return (
    <div className="space-y-1">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            data-task-action="estimate"
            disabled={
              current.isPending || mutation.isPending || !canUpdateTasks()
            }
            aria-label={`${t("parity:cycles.estimate")}: ${value == null ? t("parity:cycles.noEstimate") : estimateLabel(value, scale, i18n.language)}`}
            className="flex h-8 items-center gap-2 rounded-md border border-transparent px-2 text-xs hover:bg-accent disabled:opacity-60"
          >
            <Diamond className="size-3.5 text-muted-foreground" />
            <span>
              {value == null
                ? t("parity:cycles.estimate")
                : estimateLabel(value, scale, i18n.language)}
            </span>
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-60 p-0" align="start">
          <OptionMenu
            label={t("parity:cycles.estimate")}
            placeholder={t("parity:cycles.chooseEstimate")}
            status={
              mutation.isPending ? t("parity:planning.loading") : undefined
            }
            options={[
              {
                value: "none",
                label: t("parity:cycles.noEstimate"),
                selected: value == null,
              },
              ...estimateChoices(scale).map((estimate) => ({
                value: String(estimate),
                label: estimateLabel(estimate, scale, i18n.language),
                selected: value === estimate,
              })),
            ]}
            onSelect={(value) => {
              if (!mutation.isPending && canUpdateTasks())
                mutation.mutate(value === "none" ? null : Number(value));
            }}
          />
        </PopoverContent>
      </Popover>
      {mutation.error && (
        <p role="alert" className="text-xs text-destructive">
          {mutation.error.message}
        </p>
      )}
    </div>
  );
}

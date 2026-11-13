import { useState } from "react";
import { Flag } from "lucide-react";
import { OptionMenu } from "@/components/common/option-menu/option-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { clickTaskAction } from "@/components/task/task-action-target";
import { useShortcut } from "@/lib/shortcuts/use-shortcut";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import {
  getMilestones,
  getTaskMilestone,
  setTaskMilestone,
} from "@/fetchers/parity/projects";
import { useWorkspacePermission } from "@/hooks/use-workspace-permission";
import { refreshPlanning, usePlanningEnabled } from "./queries";

export function TaskMilestonePicker({
  taskId,
  projectId,
}: {
  taskId: string;
  projectId: string;
}) {
  const { t } = useTranslation();
  const enabled = usePlanningEnabled("projects");
  const client = useQueryClient();
  const [open, setOpen] = useState(false);
  const { canUpdateTasks } = useWorkspacePermission();
  const milestones = useQuery({
    queryKey: ["parity", "milestones", projectId],
    queryFn: () => getMilestones(projectId),
    enabled,
  });
  const current = useQuery({
    queryKey: ["parity", "task-milestone", taskId, projectId],
    queryFn: () => getTaskMilestone(taskId),
    enabled,
  });
  const mutation = useMutation({
    mutationKey: ["parity"],
    mutationFn: (milestoneId: string | null) =>
      setTaskMilestone(taskId, milestoneId),
    onSuccess: async () => {
      setOpen(false);
      await refreshPlanning(client);
    },
  });
  const disabled =
    !canUpdateTasks() ||
    mutation.isPending ||
    milestones.isPending ||
    current.isPending ||
    Boolean(milestones.error || current.error);
  useShortcut("changeMilestone", () => clickTaskAction("milestone"), {
    enabled: enabled && !disabled,
  });
  if (!enabled) return null;
  const selected = current.data?.milestoneId;
  const name =
    milestones.data?.find((item) => item.id === selected)?.name ??
    t("parity:planning.noMilestone");
  return (
    <div className="space-y-1">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            data-task-action="milestone"
            disabled={disabled}
            aria-label={`${t("parity:planning.milestone")}: ${name}`}
            className="flex h-8 items-center gap-2 rounded-md border border-transparent px-2 text-xs hover:bg-accent disabled:opacity-60"
          >
            <Flag className="size-3.5 text-muted-foreground" />
            <span>{selected ? name : t("parity:planning.milestone")}</span>
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-0" align="start">
          <OptionMenu
            label={t("parity:planning.milestone")}
            placeholder={t("parity:planning.milestone")}
            status={
              mutation.isPending ? t("parity:planning.loading") : undefined
            }
            options={[
              {
                value: "none",
                label: t("parity:planning.noMilestone"),
                selected: !selected,
              },
              ...(!milestones.isError ? (milestones.data ?? []) : []).map(
                (item) => ({
                  value: item.id,
                  label: item.name,
                  selected: item.id === selected,
                }),
              ),
            ]}
            onSelect={(value) => {
              if (!disabled) mutation.mutate(value === "none" ? null : value);
            }}
          />
        </PopoverContent>
      </Popover>
      {(mutation.error || milestones.error || current.error) && (
        <p role="alert" className="text-xs text-destructive">
          {mutation.error?.message ??
            milestones.error?.message ??
            current.error?.message}
        </p>
      )}
    </div>
  );
}

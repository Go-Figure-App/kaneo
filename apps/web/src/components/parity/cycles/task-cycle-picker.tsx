import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CircleDashed } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { OptionMenu } from "@/components/common/option-menu/option-menu";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { updateTaskCycle } from "@/fetchers/parity/cycles";
import { useWorkspacePermission } from "@/hooks/use-workspace-permission";
import { refreshPlanning } from "../planning/queries";
import { useCycleOptions, useTaskCycles } from "./queries";
import { useCycleShortcut } from "./shortcuts";

export function TaskCyclePicker({
  taskId,
  projectId,
  workspaceId,
}: {
  taskId: string;
  projectId: string;
  workspaceId: string;
}) {
  const { t } = useTranslation();
  const client = useQueryClient();
  const current = useTaskCycles(taskId, projectId);
  const { canUpdateTasks } = useWorkspacePermission();
  const [open, setOpen] = useState(false);
  const cycles = useCycleOptions(
    workspaceId,
    current.enabled && Boolean(current.data?.cyclesEnabled) && open,
  );
  const visible =
    current.enabled &&
    !current.error &&
    Boolean(current.data?.cyclesEnabled || current.data?.cycle);
  useCycleShortcut(visible && canUpdateTasks());
  const mutation = useMutation({
    mutationKey: ["parity"],
    mutationFn: (cycleId: string | null) => updateTaskCycle(taskId, cycleId),
    onSuccess: async () => {
      setOpen(false);
      await refreshPlanning(client);
    },
  });
  if (!visible) return null;
  const cycle = current.data?.cycle;
  const choicesError = current.data?.cyclesEnabled ? cycles.error : null;
  const label =
    cycle?.name ??
    (cycle
      ? t("parity:cycles.number", { number: cycle.number })
      : t("parity:cycles.cycle"));
  const choices = [...cycles.items];
  const selected =
    cycle && !choices.some((item) => item.id === cycle.id) ? [cycle] : [];
  return (
    <div className="space-y-1">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            data-task-action="cycle"
            disabled={
              current.isPending || mutation.isPending || !canUpdateTasks()
            }
            aria-label={`${t("parity:cycles.cycle")}: ${label}`}
            className="flex h-8 max-w-56 items-center gap-2 rounded-md border border-transparent px-2 text-xs hover:bg-accent disabled:opacity-60"
          >
            <CircleDashed className="size-3.5 shrink-0 text-muted-foreground" />
            <span className="truncate">{label}</span>
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-72 p-0" align="start">
          <OptionMenu
            label={t("parity:cycles.cycle")}
            placeholder={t("parity:cycles.chooseCycle")}
            status={
              mutation.isPending ? t("parity:planning.loading") : undefined
            }
            options={[
              {
                value: "none",
                label: t("parity:cycles.noCycle"),
                selected: !cycle,
              },
              ...(current.data?.cyclesEnabled && !choicesError
                ? [...selected, ...choices].map((item) => ({
                    value: item.id,
                    label:
                      item.name ??
                      t("parity:cycles.number", { number: item.number }),
                    selected: cycle?.id === item.id,
                    hint:
                      "phase" in item && item.phase === "current"
                        ? t("parity:cycles.current")
                        : undefined,
                  }))
                : []),
            ]}
            onSelect={(id) => {
              if (
                !mutation.isPending &&
                (id === "none" || !choicesError) &&
                canUpdateTasks()
              )
                mutation.mutate(id === "none" ? null : id);
            }}
          />
          {choicesError && (
            <p role="alert" className="p-2 text-xs text-destructive">
              {choicesError.message}
              <Button variant="ghost" onClick={() => void cycles.refetch()}>
                {t("parity:planning.retry")}
              </Button>
            </p>
          )}
          {current.data?.cyclesEnabled && cycles.isPending && (
            <p role="status" className="p-2 text-xs">
              {t("parity:planning.loading")}
            </p>
          )}
          {current.data?.cyclesEnabled && cycles.hasNextPage && (
            <Button
              className="m-1"
              variant="ghost"
              disabled={cycles.isFetchingNextPage}
              onClick={() => void cycles.fetchNextPage()}
            >
              {t("parity:cycles.loadMore")}
            </Button>
          )}
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

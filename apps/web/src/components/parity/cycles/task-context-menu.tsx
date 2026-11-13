import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CircleDashed, Diamond } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ContextMenuSub,
  ContextMenuSubTrigger,
  ContextMenuSubContent,
  ContextMenuItem,
  ContextMenuCheckboxItem,
} from "@/components/ui/context-menu";
import { updateTaskCycle, updateTaskEstimate } from "@/fetchers/parity/cycles";
import { useWorkspacePermission } from "@/hooks/use-workspace-permission";
import { toast } from "@/lib/toast";
import { refreshPlanning } from "../planning/queries";
import { estimateChoices, estimateLabel } from "./estimates";
import { useCycleOptions, useTaskCycles } from "./queries";

export function TaskCycleContextMenu({
  taskId,
  projectId,
  workspaceId,
}: {
  taskId: string;
  projectId: string;
  workspaceId: string;
}) {
  const { t, i18n } = useTranslation();
  const client = useQueryClient();
  const current = useTaskCycles(taskId, projectId);
  const { canUpdateTasks } = useWorkspacePermission();
  const [open, setOpen] = useState(false);
  const cycles = useCycleOptions(
    workspaceId,
    current.enabled && Boolean(current.data?.cyclesEnabled) && open,
  );
  const mutation = useMutation({
    mutationKey: ["parity"],
    mutationFn: (
      change: { cycleId: string | null } | { estimate: number | null },
    ) =>
      "cycleId" in change
        ? updateTaskCycle(taskId, change.cycleId)
        : updateTaskEstimate(taskId, change.estimate),
    onSuccess: () => refreshPlanning(client),
    onError: (error) => toast.error(error.message),
  });
  if (!current.enabled || !canUpdateTasks()) return null;
  if (current.error)
    return (
      <ContextMenuItem onClick={() => void current.refetch()}>
        {t("parity:cycles.retry")}: {current.error.message}
      </ContextMenuItem>
    );
  if (!current.data)
    return (
      <ContextMenuItem disabled>{t("parity:planning.loading")}</ContextMenuItem>
    );
  const data = current.data;
  return (
    <>
      {(data.cyclesEnabled || data.cycle) && (
        <ContextMenuSub onOpenChange={setOpen}>
          <ContextMenuSubTrigger disabled={mutation.isPending}>
            <CircleDashed className="size-3.5 text-muted-foreground" />
            {t("parity:cycles.cycle")}
          </ContextMenuSubTrigger>
          <ContextMenuSubContent className="w-64">
            <ContextMenuCheckboxItem
              closeOnClick
              checked={!data.cycle}
              disabled={mutation.isPending}
              onCheckedChange={() => mutation.mutate({ cycleId: null })}
            >
              {t("parity:cycles.noCycle")}
            </ContextMenuCheckboxItem>
            {data.cyclesEnabled &&
              cycles.items.map((cycle) => (
                <ContextMenuCheckboxItem
                  key={cycle.id}
                  closeOnClick
                  checked={data.cycle?.id === cycle.id}
                  disabled={mutation.isPending}
                  onCheckedChange={() => mutation.mutate({ cycleId: cycle.id })}
                >
                  {cycle.name ??
                    t("parity:cycles.number", { number: cycle.number })}
                  {cycle.phase === "current" && (
                    <span className="ml-auto text-xs text-muted-foreground">
                      {t("parity:cycles.current")}
                    </span>
                  )}
                </ContextMenuCheckboxItem>
              ))}
            {data.cyclesEnabled && cycles.isPending && (
              <ContextMenuItem disabled>
                {t("parity:planning.loading")}
              </ContextMenuItem>
            )}
            {data.cyclesEnabled && cycles.error && (
              <ContextMenuItem onClick={() => void cycles.refetch()}>
                {t("parity:cycles.retry")}: {cycles.error.message}
              </ContextMenuItem>
            )}
            {data.cyclesEnabled && cycles.hasNextPage && (
              <ContextMenuItem
                disabled={cycles.isFetchingNextPage}
                onClick={() => void cycles.fetchNextPage()}
              >
                {t("parity:cycles.loadMore")}
              </ContextMenuItem>
            )}
          </ContextMenuSubContent>
        </ContextMenuSub>
      )}
      {(data.estimateScale !== "none" || data.estimate !== null) && (
        <ContextMenuSub>
          <ContextMenuSubTrigger disabled={mutation.isPending}>
            <Diamond className="size-3.5 text-muted-foreground" />
            {t("parity:cycles.estimate")}
          </ContextMenuSubTrigger>
          <ContextMenuSubContent className="w-48">
            <ContextMenuCheckboxItem
              closeOnClick
              checked={data.estimate === null}
              disabled={mutation.isPending}
              onCheckedChange={() => mutation.mutate({ estimate: null })}
            >
              {t("parity:cycles.noEstimate")}
            </ContextMenuCheckboxItem>
            {estimateChoices(data.estimateScale).map((estimate) => (
              <ContextMenuCheckboxItem
                key={estimate}
                closeOnClick
                checked={data.estimate === estimate}
                disabled={mutation.isPending}
                onCheckedChange={() => mutation.mutate({ estimate })}
              >
                {estimateLabel(estimate, data.estimateScale, i18n.language)}
              </ContextMenuCheckboxItem>
            ))}
          </ContextMenuSubContent>
        </ContextMenuSub>
      )}
    </>
  );
}

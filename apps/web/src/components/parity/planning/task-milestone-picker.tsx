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
    mutationFn: (milestoneId: string | null) =>
      setTaskMilestone(taskId, milestoneId),
    onSuccess: () => refreshPlanning(client),
  });
  if (!enabled) return null;
  return (
    <div className="space-y-1">
      <label className="flex min-w-0 items-center gap-3 text-xs">
        <span className="text-muted-foreground">
          {t("parity:planning.milestone")}
        </span>
        <select
          className="min-w-0 flex-1 rounded-md border border-transparent bg-transparent px-2 py-1.5 hover:bg-accent"
          value={current.data?.milestoneId ?? ""}
          disabled={
            !canUpdateTasks() ||
            mutation.isPending ||
            milestones.isPending ||
            current.isPending ||
            Boolean(milestones.error || current.error)
          }
          onChange={(event) => mutation.mutate(event.target.value || null)}
        >
          <option value="">{t("parity:planning.noMilestone")}</option>
          {milestones.data?.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
      </label>
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

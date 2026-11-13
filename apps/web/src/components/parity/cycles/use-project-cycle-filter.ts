import { useQuery } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";
import { getProjectCycleTasks } from "@/fetchers/parity/cycles";
import { useStoredState } from "@/hooks/use-stored-state";
import { usePlanningEnabled } from "../planning/queries";

export function useProjectCycleFilter(projectId: string, workspaceId: string) {
  const enabled = usePlanningEnabled("cycles");
  const [saved, setValue] = useStoredState<string | null>(
    `kaneo:cycle-filter:${workspaceId}:${projectId}`,
    (raw) => (typeof raw === "string" && raw.length <= 200 ? raw : null),
    null,
  );
  const value = enabled ? saved : null;
  const query = useQuery({
    queryKey: ["parity", "project-cycle-tasks", projectId],
    queryFn: () => getProjectCycleTasks(projectId),
    enabled: enabled && value !== null,
  });
  const assignments = useMemo(
    () => new Map(query.data?.items.map((item) => [item.taskId, item.cycleId])),
    [query.data],
  );
  const matches = useCallback(
    (task: { id: string }) => {
      if (value === null) return true;
      // Unknown data must not turn a selected filter into an unfiltered board.
      if (query.isError || !query.data) return false;
      const cycleId = assignments.get(task.id);
      if (value === "none") return !cycleId;
      if (value === "current")
        return (
          Boolean(query.data.currentCycleId) &&
          cycleId === query.data.currentCycleId
        );
      return cycleId === value;
    },
    [value, query.isError, query.data, assignments],
  );
  return { enabled, value, setValue, matches, query, workspaceId };
}

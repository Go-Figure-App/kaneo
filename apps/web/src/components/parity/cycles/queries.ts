import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { getCycles, getTaskCycleProperties } from "@/fetchers/parity/cycles";
import { usePlanningEnabled } from "../planning/queries";
import { uniquePageItems } from "../planning/unique-page-items";
import { sortCycleOptions } from "./sort-options";

export function useTaskCycles(taskId: string, projectId: string) {
  const enabled = usePlanningEnabled("cycles");
  const query = useQuery({
    queryKey: ["parity", "task-cycles", taskId, projectId],
    queryFn: () => getTaskCycleProperties(taskId),
    enabled,
  });
  return { ...query, enabled };
}
export function useCycleOptions(workspaceId: string, enabled: boolean) {
  const query = useInfiniteQuery({
    queryKey: ["parity", "cycle-options", workspaceId],
    queryFn: ({ pageParam }) => getCycles(workspaceId, "all", pageParam),
    initialPageParam: 1,
    getNextPageParam: (page) => (page.hasMore ? page.page + 1 : undefined),
    enabled: enabled && Boolean(workspaceId),
  });
  return {
    ...query,
    items: query.isError
      ? []
      : sortCycleOptions(uniquePageItems(query.data?.pages)),
  };
}

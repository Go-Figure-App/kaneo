import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { usePlanningEnabled } from "../planning/queries";
import { uniquePageItems } from "../planning/unique-page-items";
import { cyclesApi } from "./api";
import { sortCycleOptions } from "./sort-options";
import { useCycleFocus } from "./use-cycle-focus";

export function useCurrentCycle(workspaceId: string) {
  const enabled = usePlanningEnabled("cycles");
  const query = useQuery({
    queryKey: ["parity", "cycle-current", workspaceId],
    queryFn: () => cyclesApi.list(workspaceId, "current"),
    enabled: enabled && Boolean(workspaceId),
  });
  useCycleFocus(query.refetch, enabled && Boolean(workspaceId));
  return {
    ...query,
    enabled,
    cycle: query.isError ? undefined : query.data?.items[0],
  };
}
export function useCycleOptions(workspaceId: string, enabled: boolean) {
  const query = useInfiniteQuery({
    queryKey: ["parity", "cycle-options", workspaceId],
    queryFn: ({ pageParam }) => cyclesApi.list(workspaceId, "all", pageParam),
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

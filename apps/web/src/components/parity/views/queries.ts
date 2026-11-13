import {
  useInfiniteQuery,
  useQuery,
  type QueryClient,
} from "@tanstack/react-query";
import {
  getFavorites,
  getSavedViews,
  getViewOptions,
  getTemplates,
} from "@/fetchers/parity/views";
import { usePlanningEnabled } from "../planning/queries";
export function useViewOptions(workspaceId: string, projectId?: string) {
  const enabled = usePlanningEnabled("views");
  return useQuery({
    queryKey: ["parity", "view-options", workspaceId, projectId],
    queryFn: () => getViewOptions(workspaceId, projectId),
    enabled: enabled && Boolean(workspaceId),
  });
}
export function useSavedViews(workspaceId: string) {
  const enabled = usePlanningEnabled("views");
  return useInfiniteQuery({
    queryKey: ["parity", "views", workspaceId],
    queryFn: ({ pageParam }) => getSavedViews(workspaceId, pageParam),
    initialPageParam: 1,
    getNextPageParam: (page) => (page.hasMore ? page.page + 1 : undefined),
    enabled: enabled && Boolean(workspaceId),
  });
}
export function useFavorites(workspaceId: string) {
  const enabled = usePlanningEnabled("views");
  return useQuery({
    queryKey: ["parity", "favorites", workspaceId],
    queryFn: () => getFavorites(workspaceId),
    enabled: enabled && Boolean(workspaceId),
  });
}
export async function refreshViews(client: QueryClient) {
  await client.invalidateQueries({ queryKey: ["parity"] });
}
export function useTemplates(projectId: string) {
  const enabled = usePlanningEnabled("views");
  return useInfiniteQuery({
    queryKey: ["parity", "templates", projectId],
    queryFn: ({ pageParam }) => getTemplates(projectId, pageParam),
    initialPageParam: 1,
    getNextPageParam: (page) => (page.hasMore ? page.page + 1 : undefined),
    enabled: enabled && Boolean(projectId),
  });
}

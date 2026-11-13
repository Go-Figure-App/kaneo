import { useQuery, type QueryClient } from "@tanstack/react-query";
import { getParityFeatures } from "@/fetchers/parity/foundation";
import { getTriageCount } from "@/fetchers/parity/triage";

export function useTriageEnabled() {
  const features = useQuery({
    queryKey: ["parity", "features"],
    queryFn: getParityFeatures,
  });
  return features.data?.features.includes("triage") ?? false;
}
export function useTriageCount(workspaceId?: string) {
  const enabled = useTriageEnabled();
  const query = useQuery({
    queryKey: ["parity", "triage", workspaceId, "count"],
    queryFn: () => getTriageCount(workspaceId!),
    enabled: enabled && Boolean(workspaceId),
    refetchInterval: 30_000,
  });
  return { enabled, ...query };
}
export async function refreshTriage(client: QueryClient) {
  await Promise.all(
    [
      "parity",
      "tasks",
      "task",
      "projects",
      "assigned-tasks",
      "notifications",
      "activities",
      "task-relations",
    ].map((key) => client.invalidateQueries({ queryKey: [key] })),
  );
}

import { useQuery } from "@tanstack/react-query";
import { triageApi } from "./api";

export function useTriageEnabled() {
  const features = useQuery({
    queryKey: ["parity", "features"],
    queryFn: triageApi.features,
  });
  return features.data?.features.includes("triage") ?? false;
}
export function useTriageCount(workspaceId?: string) {
  const enabled = useTriageEnabled();
  return useQuery({
    queryKey: ["parity", "triage", workspaceId, "count"],
    queryFn: () => triageApi.count(workspaceId!),
    enabled: enabled && Boolean(workspaceId),
    refetchInterval: 30_000,
  });
}

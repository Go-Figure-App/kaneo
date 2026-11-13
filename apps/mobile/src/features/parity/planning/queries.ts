import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/endpoints";
import { qk } from "@/lib/query";
import { triageApi } from "../triage/api";

export function usePlanningEnabled(
  feature: "projects" | "initiatives" | "roadmap" | "cycles" = "projects",
) {
  const query = useQuery({
    queryKey: ["parity", "features"],
    queryFn: triageApi.features,
  });
  return query.data?.features.includes(feature) ?? false;
}
export function usePlanningPermissions(workspaceId?: string) {
  return useQuery({
    queryKey: qk.capabilities(workspaceId ?? ""),
    queryFn: () => api.workspaceCapabilities(workspaceId!),
    enabled: Boolean(workspaceId),
  });
}

import { useQuery, type QueryClient } from "@tanstack/react-query";
import { getParityFeatures } from "@/fetchers/parity/foundation";

export function usePlanningEnabled(feature: "projects" | "initiatives") {
  const query = useQuery({
    queryKey: ["parity", "features"],
    queryFn: getParityFeatures,
  });
  return query.data?.features.includes(feature) ?? false;
}
export async function refreshPlanning(client: QueryClient) {
  await Promise.all(
    ["parity", "activities", "task", "projects"].map((key) =>
      client.invalidateQueries({ queryKey: [key] }),
    ),
  );
}

import type { QueryClient } from "@tanstack/react-query";

export function configureParityQueries(client: QueryClient) {
  // Workspace hints invalidate inactive views too. Revisit them through the API
  // instead of retaining an invalidated result under upstream's mount policy.
  client.setQueryDefaults(["parity"], { refetchOnMount: true });
  client.setQueryDefaults(["parity", "features"], { staleTime: 30_000 });
}

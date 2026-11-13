import type { QueryClient } from "@tanstack/react-query";

const events = new Set([
  "INITIATIVE_UPDATED",
  "PROJECT_PLAN_UPDATED",
  "CYCLE_UPDATED",
  "TRIAGE_UPDATED",
  "VIEW_UPDATED",
]);

export function invalidateParity(client: QueryClient, event: { type: string }) {
  if (
    [
      "PROJECT_ACCESS_CHANGED",
      "WORKSPACE_ACCESS_REVOKED",
      "WORKSPACE_ACCESS_SYNC",
      "USER_ACCESS_REVOKED",
    ].includes(event.type)
  ) {
    if (
      client
        .getQueryCache()
        .getAll()
        .some((query) => query.queryKey[0] === "parity")
    )
      client.removeQueries({ queryKey: ["parity"] });
    return;
  }
  if (events.has(event.type))
    void client.invalidateQueries({ queryKey: ["parity"] });
}

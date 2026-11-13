import type { QueryClient } from "@tanstack/react-query";

const events = new Set([
  "INITIATIVE_UPDATED",
  "PROJECT_PLAN_UPDATED",
  "CYCLE_UPDATED",
  "TRIAGE_UPDATED",
  "VIEW_UPDATED",
]);

export function invalidateParity(
  client: QueryClient,
  message: { type?: string; workspaceId?: string },
) {
  if (
    message.type &&
    [
      "PROJECT_ACCESS_CHANGED",
      "WORKSPACE_ACCESS_REVOKED",
      "WORKSPACE_ACCESS_SYNC",
      "USER_ACCESS_REVOKED",
    ].includes(message.type)
  ) {
    const filter = {
      queryKey: ["parity"],
      predicate: (query: { queryKey: readonly unknown[] }) =>
        query.queryKey[1] !== "features",
    };
    const queries = client.getQueryCache().findAll(filter);
    if (!queries.length) return;
    void client.cancelQueries(filter, { revert: false, silent: true });
    for (const query of queries) {
      if (query.getObserversCount()) {
        // Keep mounted observers attached across the initial access sync. Removing
        // their query strands pending screens even after their request succeeds.
        query.setState({
          data: undefined,
          dataUpdatedAt: 0,
          error: null,
          status: "pending",
          fetchStatus: "idle",
        });
      } else client.removeQueries({ queryKey: query.queryKey, exact: true });
    }
    void client.refetchQueries({ ...filter, type: "active" });
    return;
  }
  if (
    !message.type ||
    !events.has(message.type) ||
    typeof message.workspaceId !== "string"
  )
    return;
  // Responses remain authoritative; a socket message only invalidates cached data.
  void client.invalidateQueries({ queryKey: ["parity"] });
}

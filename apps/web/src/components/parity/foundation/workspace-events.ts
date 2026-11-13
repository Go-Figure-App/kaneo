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
    client.removeQueries({ queryKey: ["parity"] });
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

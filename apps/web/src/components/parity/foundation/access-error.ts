import type { QueryClient } from "@tanstack/react-query";

export function isAccessError(error: unknown) {
  return Boolean(
    error &&
    typeof error === "object" &&
    "status" in error &&
    (error.status === 401 || error.status === 403 || error.status === 404),
  );
}

export function clearParityOnAccessError(
  client: QueryClient,
  error: unknown,
  operationKey: readonly unknown[] | undefined,
) {
  if (operationKey?.[0] !== "parity" || !isAccessError(error)) return;
  // Feature flags contain server configuration, not workspace content. Keep
  // them available so protected screens can still show an error and retry.
  const filter = {
    queryKey: ["parity"],
    predicate: (query: { queryKey: readonly unknown[] }) =>
      query.queryKey[1] !== "features",
  };
  // Cancel pending reads before erasing data so they cannot repopulate it.
  void client.cancelQueries(filter, { revert: false, silent: true });
  for (const query of client.getQueryCache().findAll(filter)) {
    if (query.getObserversCount()) {
      // Keep the error/retry state for mounted screens; removing their query
      // would replace it with a fresh pending state without initiating a fetch.
      query.setState({
        data: undefined,
        error: error instanceof Error ? error : new Error("Access denied"),
        status: "error",
        fetchStatus: "idle",
      });
    } else {
      client.removeQueries({ queryKey: query.queryKey, exact: true });
    }
  }
}

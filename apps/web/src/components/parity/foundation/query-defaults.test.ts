import { QueryClient, QueryObserver } from "@tanstack/react-query";
import { expect, it, vi } from "vite-plus/test";
import { configureParityQueries } from "./query-defaults";
import { invalidateParity } from "./workspace-events";

it("refreshes invalidated planning views when revisited while retaining upstream query behavior", async () => {
  const client = new QueryClient({
    defaultOptions: {
      queries: { refetchOnMount: false, retry: false, staleTime: Infinity },
    },
  });
  configureParityQueries(client);
  const key = ["parity", "cycle", "cycle-id"];
  client.setQueryData(key, { scopePoints: 0 });
  client.setQueryData(["tasks", "project"], []);
  invalidateParity(client, { type: "CYCLE_UPDATED", workspaceId: "workspace" });
  const fetch = vi.fn().mockResolvedValue({ scopePoints: 5 });
  const observer = new QueryObserver(client, { queryKey: key, queryFn: fetch });
  const unsubscribe = observer.subscribe(() => {});
  await vi.waitFor(() =>
    expect(observer.getCurrentResult().data).toEqual({ scopePoints: 5 }),
  );
  expect(fetch).toHaveBeenCalledOnce();
  const upstream = vi.fn().mockResolvedValue([]);
  const board = new QueryObserver(client, {
    queryKey: ["tasks", "project"],
    queryFn: upstream,
  });
  const unsubscribeBoard = board.subscribe(() => {});
  expect(upstream).not.toHaveBeenCalled();
  unsubscribe();
  unsubscribeBoard();
  client.clear();
});

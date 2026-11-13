import { QueryClient, QueryObserver } from "@tanstack/react-query";
import { expect, it, vi } from "vite-plus/test";
import { invalidateParity } from "./workspace-events";

it("invalidates planning data without accepting payload data or invalidating board queries", () => {
  const client = new QueryClient();
  client.setQueryData(
    ["parity", "columns", "project"],
    [{ category: "started" }],
  );
  client.setQueryData(["tasks", "project"], []);
  invalidateParity(client, {
    type: "PROJECT_PLAN_UPDATED",
    workspaceId: "workspace",
  });
  expect(
    client.getQueryState(["parity", "columns", "project"])?.isInvalidated,
  ).toBe(true);
  expect(client.getQueryState(["tasks", "project"])?.isInvalidated).toBe(false);
  expect(client.getQueryData(["parity", "columns", "project"])).toEqual([
    { category: "started" },
  ]);
  invalidateParity(client, {
    type: "PROJECT_ACCESS_CHANGED",
    workspaceId: "workspace",
  });
  expect(client.getQueryData(["parity", "columns", "project"])).toBeUndefined();
  client.clear();
});

it("leaves upstream cache handling alone when no planning queries exist", () => {
  const client = new QueryClient();
  client.setQueryData(["tasks", "project"], []);
  const remove = vi.spyOn(client, "removeQueries");
  invalidateParity(client, {
    type: "WORKSPACE_ACCESS_REVOKED",
    workspaceId: "workspace",
  });
  expect(remove).not.toHaveBeenCalled();
  expect(client.getQueryData(["tasks", "project"])).toEqual([]);
  client.clear();
});

it("clears sensitive reports and refetches mounted observers after access sync", async () => {
  const client = new QueryClient();
  const key = ["parity", "insights", "workspace", { measure: "throughput" }];
  client.setQueryData(key, { total: 99 });
  client.setQueryData(["parity", "features"], { features: ["insights"] });
  client.setQueryData(["parity", "inactive"], { private: true });
  const fetch = vi.fn().mockResolvedValue({ total: 3 });
  const observer = new QueryObserver(client, {
    queryKey: key,
    queryFn: fetch,
    staleTime: Infinity,
  });
  const unsubscribe = observer.subscribe(() => {});
  invalidateParity(client, { type: "WORKSPACE_ACCESS_SYNC" });
  expect(observer.getCurrentResult().data).toBeUndefined();
  expect(client.getQueryData(["parity", "inactive"])).toBeUndefined();
  expect(client.getQueryData(["parity", "features"])).toEqual({
    features: ["insights"],
  });
  await vi.waitFor(() =>
    expect(observer.getCurrentResult().data).toEqual({ total: 3 }),
  );
  expect(fetch).toHaveBeenCalledOnce();
  unsubscribe();
  client.clear();
});

it("restarts a pending report without allowing its old result to restore revoked data", async () => {
  const client = new QueryClient();
  let finishOld!: (value: { total: number }) => void;
  const fetch = vi
    .fn()
    .mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finishOld = resolve;
        }),
    )
    .mockResolvedValue({ total: 1 });
  const observer = new QueryObserver(client, {
    queryKey: ["parity", "insights", "workspace"],
    queryFn: fetch,
  });
  const unsubscribe = observer.subscribe(() => {});
  invalidateParity(client, {
    type: "PROJECT_ACCESS_CHANGED",
    workspaceId: "workspace",
  });
  await vi.waitFor(() =>
    expect(observer.getCurrentResult().data).toEqual({ total: 1 }),
  );
  finishOld({ total: 100 });
  await Promise.resolve();
  expect(observer.getCurrentResult().data).toEqual({ total: 1 });
  expect(fetch).toHaveBeenCalledTimes(2);
  unsubscribe();
  client.clear();
});

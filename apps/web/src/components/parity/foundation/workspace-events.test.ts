import { QueryClient } from "@tanstack/react-query";
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

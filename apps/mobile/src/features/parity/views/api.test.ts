import { beforeEach, expect, it, vi } from "vite-plus/test";
const request = vi.hoisted(() =>
  vi.fn().mockResolvedValue({ items: [], hasMore: true }),
);
vi.mock("@/lib/api/client", () => ({ request }));
import { viewsApi } from "./api";
import type { SavedView } from "./types";
beforeEach(() => request.mockClear());
it("forwards saved filters, null values, scope and ordering without changing their meaning", async () => {
  const view: SavedView = {
    id: "v",
    workspaceId: "w/a",
    ownerId: "owner",
    name: "My view",
    icon: null,
    shared: false,
    canEdit: true,
    filters: [
      { field: "assignee", operator: "is-not", values: ["u/a", null] },
      { field: "due", operator: "before", value: "2026-11-01" },
    ],
    projectId: "p/a",
    display: {
      orderBy: "due",
      direction: "desc",
      layout: "list",
      groupBy: "state",
      properties: [],
    },
  };
  await viewsApi.tasks("w/a", 2, view);
  expect(request).toHaveBeenLastCalledWith("api/parity/tasks/w%2Fa", {
    query: {
      page: 2,
      pageSize: 50,
      filters: JSON.stringify(view.filters),
      projectId: "p/a",
      orderBy: "due",
      direction: "desc",
    },
  });
  await viewsApi.view("w/a", "v/b");
  expect(request).toHaveBeenLastCalledWith("api/parity/views/w%2Fa/v%2Fb");
});
it("keeps pagination and permission failures visible to native screens", async () => {
  expect((await viewsApi.list("w", 3)).hasMore).toBe(true);
  expect(request).toHaveBeenLastCalledWith("api/parity/views/w", {
    query: { page: 3, pageSize: 50 },
  });
  request.mockRejectedValueOnce(new Error("Forbidden"));
  await expect(viewsApi.tasks("w")).rejects.toThrow("Forbidden");
});

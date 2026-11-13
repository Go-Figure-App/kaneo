import { beforeEach, expect, it, vi } from "vite-plus/test";
const request = vi.hoisted(() => vi.fn().mockResolvedValue({ id: "item" }));
vi.mock("@/lib/api/client", () => ({ request }));
import { planningApi } from "./api";

beforeEach(() => request.mockClear());
it("keeps cleared owners, dates and milestones as explicit nulls", async () => {
  await planningApi.updateProject("project/one", {
    leadId: null,
    startDate: null,
    targetDate: null,
  });
  await planningApi.updateInitiative("initiative/one", {
    ownerId: null,
    targetDate: null,
  });
  await planningApi.setMilestone("task/one", null);
  expect(request).toHaveBeenNthCalledWith(
    1,
    "api/parity/project-plan/project%2Fone",
    {
      method: "PUT",
      body: { leadId: null, startDate: null, targetDate: null },
      keepNulls: true,
    },
  );
  expect(request).toHaveBeenNthCalledWith(
    2,
    "api/parity/initiative/item/initiative%2Fone",
    {
      method: "PUT",
      body: { ownerId: null, targetDate: null },
      keepNulls: true,
    },
  );
  expect(request).toHaveBeenNthCalledWith(
    3,
    "api/parity/task/task%2Fone/milestone",
    { method: "PUT", body: { milestoneId: null }, keepNulls: true },
  );
});
it("paginates initiatives and updates and keeps Markdown intact", async () => {
  request.mockResolvedValueOnce({
    items: [],
    hasMore: true,
    page: 2,
    pageSize: 50,
  });
  const page = await planningApi.initiatives("workspace", 2, true);
  expect(page.hasMore).toBe(true);
  expect(request).toHaveBeenLastCalledWith("api/parity/initiative/workspace", {
    query: { page: 2, pageSize: 50, includeArchived: "true" },
  });
  await planningApi.updates("initiative", "id", 3);
  expect(request).toHaveBeenLastCalledWith(
    "api/parity/status-update/initiative/id",
    { query: { page: 3, pageSize: 20 } },
  );
  const body = {
    health: "at_risk" as const,
    body: "## Update\n\n- [x] **Ready**\n- [ ] Next step",
  };
  await planningApi.postUpdate("project", "id", body);
  expect(request).toHaveBeenLastCalledWith(
    "api/parity/status-update/project/id",
    { method: "POST", body },
  );
});
it("surfaces permission failures to the action error handler", async () => {
  request.mockRejectedValueOnce(new Error("Forbidden"));
  await expect(
    planningApi.updateInitiative("id", { name: "Plan" }),
  ).rejects.toThrow("Forbidden");
});

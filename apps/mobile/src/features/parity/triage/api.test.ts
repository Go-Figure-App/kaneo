import { beforeEach, expect, it, vi } from "vite-plus/test";
const request = vi.hoisted(() => vi.fn().mockResolvedValue({ id: "task" }));
vi.mock("@/lib/api/client", () => ({ request }));
import { triageApi } from "./api";

beforeEach(() => request.mockClear());
it("keeps explicit null when accepting and encodes resource identifiers", async () => {
  await triageApi.decide("task/one", {
    action: "accept",
    body: { columnId: "column", assigneeId: null },
  });
  expect(request).toHaveBeenCalledWith(
    "api/parity/triage/item/task%2Fone/accept",
    {
      method: "POST",
      body: { columnId: "column", assigneeId: null },
      keepNulls: true,
    },
  );
});
it("preserves optional task fields when sending a task to triage", async () => {
  const input = {
    title: "Report",
    priority: "urgent",
    description: "Details",
    dueDate: "2030-01-01",
    customFields: [{ fieldId: "size", value: "3" }],
  };
  await triageApi.create("project", input);
  expect(request).toHaveBeenCalledWith("api/parity/triage/project/project", {
    method: "POST",
    body: input,
  });
});
it("requests bounded inbox pages and a separate count", async () => {
  await triageApi.list("workspace", 2);
  await triageApi.count("workspace");
  expect(request).toHaveBeenNthCalledWith(1, "api/parity/triage/workspace", {
    query: { page: 2, pageSize: 50 },
  });
  expect(request).toHaveBeenNthCalledWith(
    2,
    "api/parity/triage/workspace/count",
  );
});

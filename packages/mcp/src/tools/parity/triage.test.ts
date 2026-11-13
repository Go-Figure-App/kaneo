import { expect, it, vi } from "vite-plus/test";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { registerTriageTools } from "./triage.js";

function fixture() {
  const tools = new Map<string, (input: unknown) => Promise<CallToolResult>>();
  const json = vi.fn().mockResolvedValue({ id: "task" });
  registerTriageTools(
    { registerTool: (name, _config, callback) => tools.set(name, callback) },
    { json },
  );
  return { tools, json };
}
it("registers four bounded triage operations and encodes workspace filters", async () => {
  const { tools, json } = fixture();
  expect([...tools.keys()]).toEqual([
    "list_triage_items",
    "create_triage_item",
    "accept_triage_item",
    "decline_triage_item",
  ]);
  await tools.get("list_triage_items")!({
    workspaceId: "team/a",
    projectId: "a&b",
    page: 2,
  });
  expect(json).toHaveBeenCalledWith(
    "/api/parity/triage/team%2Fa?projectId=a%26b&page=2",
    { method: "GET" },
  );
  json.mockClear();
  expect(
    (
      await tools.get("list_triage_items")!({
        workspaceId: "team",
        pageSize: 101,
      })
    ).isError,
  ).toBe(true);
  expect(json).not.toHaveBeenCalled();
});
it("creates and accepts through the same authenticated API, preserving explicit unassignment", async () => {
  const { tools, json } = fixture();
  await tools.get("create_triage_item")!({
    projectId: "project",
    title: " Report ",
    description: "Details",
  });
  expect(json).toHaveBeenLastCalledWith("/api/parity/triage/project", {
    method: "POST",
    body: JSON.stringify({ title: "Report", description: "Details" }),
  });
  await tools.get("accept_triage_item")!({
    taskId: "task",
    columnId: "column",
    assigneeId: null,
  });
  expect(json).toHaveBeenLastCalledWith("/api/parity/triage/item/task/accept", {
    method: "POST",
    body: JSON.stringify({ columnId: "column", assigneeId: null }),
  });
});
it("requires decline explanations and reports authorization failures as tool errors", async () => {
  const { tools, json } = fixture();
  expect(
    (await tools.get("decline_triage_item")!({ taskId: "task", comment: "  " }))
      .isError,
  ).toBe(true);
  expect(json).not.toHaveBeenCalled();
  json.mockRejectedValue(new Error("Insufficient API key scope"));
  const result = await tools.get("decline_triage_item")!({
    taskId: "task",
    comment: "Outside scope",
  });
  expect(result.isError).toBe(true);
  expect(result.content).toEqual([
    {
      type: "text",
      text: JSON.stringify({ error: "Insufficient API key scope" }, null, 2),
    },
  ]);
});

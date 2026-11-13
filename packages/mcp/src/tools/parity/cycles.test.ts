import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { expect, it, vi } from "vite-plus/test";
import { registerTools } from "../register.js";

function fixture() {
  const tools = new Map<string, (input: unknown) => Promise<CallToolResult>>();
  const json = vi.fn().mockResolvedValue({ id: "cycle" });
  registerTools(
    { registerTool: (name, _config, callback) => tools.set(name, callback) },
    { client: { json } },
  );
  return { tools, json };
}
it("registers cycle operations in the shared HTTP/stdio registry with encoded paths and explicit clearing", async () => {
  const { tools, json } = fixture();
  await tools.get("list_cycles")!({
    workspaceId: "a/b",
    phase: "current",
    page: 2,
    pageSize: 50,
  });
  expect(json).toHaveBeenLastCalledWith(
    "/api/parity/cycle/a%2Fb?phase=current&page=2&pageSize=50",
    { method: "GET" },
  );
  await tools.get("get_cycle")!({ id: "a/b" });
  expect(json).toHaveBeenLastCalledWith("/api/parity/cycle/item/a%2Fb", {
    method: "GET",
  });
  for (const [tool, key, path] of [
    ["update_task_cycle", "cycleId", "cycle"],
    ["update_task_estimate", "estimate", "estimate"],
  ] as const) {
    await tools.get(tool)!({ taskId: "a/b", [key]: null });
    expect(json).toHaveBeenLastCalledWith(`/api/parity/task/a%2Fb/${path}`, {
      method: "PUT",
      body: JSON.stringify({ [key]: null }),
    });
  }
  await tools.get("update_task_estimate")!({ taskId: "t", estimate: 5 });
  expect(json).toHaveBeenLastCalledWith("/api/parity/task/t/estimate", {
    method: "PUT",
    body: '{"estimate":5}',
  });
});
it("rejects missing, unbounded and invalid inputs before making requests", async () => {
  const { tools, json } = fixture();
  for (const [tool, input] of [
    ["list_cycles", { workspaceId: "w", pageSize: 101 }],
    ["list_cycles", { workspaceId: "w", phase: "active" }],
    ["get_cycle", { id: " ".repeat(130) }],
    ["get_cycle", { id: "x".repeat(129) }],
    ["update_task_cycle", { taskId: "t" }],
    ["update_task_estimate", { taskId: "t" }],
    ["update_task_estimate", { taskId: "t", estimate: 13 }],
    ["update_task_estimate", { taskId: "t", estimate: 1.5 }],
  ] as const)
    expect((await tools.get(tool)!(input)).isError).toBe(true);
  expect(json).not.toHaveBeenCalled();
});
it("returns scale and access failures as tool errors", async () => {
  const { tools, json } = fixture();
  json.mockRejectedValue(new Error("Estimate is not on the workspace scale"));
  const result = await tools.get("update_task_estimate")!({
    taskId: "t",
    estimate: 4,
  });
  expect(result.isError).toBe(true);
  expect(JSON.stringify(result.content)).toContain(
    "Estimate is not on the workspace scale",
  );
});

import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { expect, it, vi } from "vite-plus/test";
import { registerPlanningTools } from "./planning.js";

function fixture() {
  const tools = new Map<string, (input: unknown) => Promise<CallToolResult>>();
  const json = vi.fn().mockResolvedValue({ id: "project" });
  registerPlanningTools(
    { registerTool: (name, _config, callback) => tools.set(name, callback) },
    { json },
  );
  return { tools, json };
}
it("registers the eight planning operations and encodes path and pagination values", async () => {
  const { tools, json } = fixture();
  expect([...tools.keys()]).toEqual([
    "get_project_plan",
    "update_project_plan",
    "list_milestones",
    "create_status_update",
    "list_initiatives",
    "get_initiative",
    "create_initiative",
    "add_project_to_initiative",
  ]);
  await tools.get("get_project_plan")!({ projectId: "a/b" });
  expect(json).toHaveBeenLastCalledWith("/api/parity/project-plan/a%2Fb", {
    method: "GET",
  });
  await tools.get("list_initiatives")!({
    workspaceId: "a/b",
    page: 2,
    includeArchived: false,
  });
  expect(json).toHaveBeenLastCalledWith(
    "/api/parity/initiative/a%2Fb?page=2&includeArchived=false",
    { method: "GET" },
  );
  await tools.get("add_project_to_initiative")!({
    initiativeId: "a/b",
    projectId: "c/d",
  });
  expect(json).toHaveBeenLastCalledWith(
    "/api/parity/initiative/item/a%2Fb/project/c%2Fd",
    { method: "POST", body: "{}" },
  );
});
it("preserves explicit clearing and Markdown while rejecting invalid dates and blank updates", async () => {
  const { tools, json } = fixture();
  await tools.get("update_project_plan")!({
    projectId: "p",
    leadId: null,
    targetDate: null,
  });
  expect(json).toHaveBeenLastCalledWith("/api/parity/project-plan/p", {
    method: "PUT",
    body: JSON.stringify({ leadId: null, targetDate: null }),
  });
  const body = "## Risks\n\n- [ ] Review";
  await tools.get("create_status_update")!({
    parentType: "project",
    parentId: "p",
    health: "at_risk",
    body,
  });
  expect(JSON.parse(json.mock.lastCall![1].body)).toEqual({
    health: "at_risk",
    body,
  });
  json.mockClear();
  expect(
    (
      await tools.get("update_project_plan")!({
        projectId: "p",
        targetDate: "2026-02-30",
      })
    ).isError,
  ).toBe(true);
  expect(
    (
      await tools.get("create_status_update")!({
        parentType: "project",
        parentId: "p",
        health: "on_track",
        body: " ",
      })
    ).isError,
  ).toBe(true);
  expect(json).not.toHaveBeenCalled();
});
it("reports denied API permissions as tool errors", async () => {
  const { tools, json } = fixture();
  json.mockRejectedValue(new Error("Insufficient API key scope"));
  const result = await tools.get("create_initiative")!({
    workspaceId: "w",
    name: "Plan",
  });
  expect(result.isError).toBe(true);
  expect(result.content).toEqual([
    {
      type: "text",
      text: JSON.stringify({ error: "Insufficient API key scope" }, null, 2),
    },
  ]);
});

import { expect, it, vi } from "vite-plus/test";
import { registerTools } from "../register.js";
function setup() {
  const tools = new Map<string, (input: never) => Promise<unknown>>();
  const json = vi.fn().mockResolvedValue({ items: [] });
  registerTools(
    {
      registerTool: (name, _config, handler) => {
        tools.set(name, handler as never);
      },
    },
    { client: { json } as never },
  );
  return { tools, json };
}
it("registers Views tools on the shared HTTP/stdio catalog and encodes filters losslessly", async () => {
  const { tools, json } = setup();
  const filters = [
    { field: "label", operator: "is-not", values: ["A&B/QA", null] },
    { field: "completed", operator: "after", value: "2026-11-01" },
  ];
  await tools.get("list_workspace_tasks")!({
    workspaceId: "w/a",
    filters,
    page: 2,
  } as never);
  const url = new URL(json.mock.calls[0]![0], "https://example.test");
  expect(url.pathname).toBe("/api/parity/tasks/w%2Fa");
  expect(JSON.parse(url.searchParams.get("filters")!)).toEqual(filters);
  expect(url.searchParams.get("page")).toBe("2");
  await tools.get("list_saved_views")!({
    workspaceId: "w/a",
    pageSize: 50,
  } as never);
  expect(json).toHaveBeenLastCalledWith("/api/parity/views/w%2Fa?pageSize=50", {
    method: "GET",
  });
});
it("rejects unsupported operators, missing comparisons and unbounded pages before sending a request", async () => {
  const { tools, json } = setup();
  for (const input of [
    { filters: [{ field: "project", operator: "after", values: ["p"] }] },
    { filters: [{ field: "due", operator: "before", value: null }] },
    { pageSize: 101 },
    {
      filters: [
        {
          field: "label",
          operator: "is",
          values: Array(50).fill("界".repeat(200)),
        },
      ],
    },
  ])
    expect(
      await tools.get("list_workspace_tasks")!({
        workspaceId: "w",
        ...input,
      } as never),
    ).toMatchObject({ isError: true });
  expect(json).not.toHaveBeenCalled();
});

import { z } from "zod";
import { errorResult, textResult } from "../../utils/mcp-result.js";
import type { ToolClient, ToolRegistrar } from "../register.js";

// Shared by the stdio package and the authenticated HTTP MCP endpoint.
export function registerCycleTools(server: ToolRegistrar, client: ToolClient) {
  const id = z.string().trim().min(1).max(128);
  function register<S extends z.ZodObject>(
    name: string,
    description: string,
    inputSchema: S,
    run: (input: z.output<S>) => Promise<unknown>,
  ) {
    server.registerTool(name, { description, inputSchema }, async (input) => {
      const parsed = inputSchema.safeParse(input);
      if (!parsed.success) return errorResult(z.prettifyError(parsed.error));
      try {
        return textResult(await run(parsed.data));
      } catch (error) {
        return errorResult(
          error instanceof Error ? error.message : String(error),
        );
      }
    });
  }
  register(
    "list_cycles",
    "List current, upcoming or past workspace cycles, with progress from readable projects and the workspace's estimate scale. Cycles run automatically; there is no manual start operation.",
    z.object({
      workspaceId: id,
      phase: z.enum(["current", "upcoming", "past", "all"]).optional(),
      page: z.number().int().min(1).max(100_000).optional(),
      pageSize: z.number().int().min(1).max(100).optional(),
    }),
    ({ workspaceId, ...options }) => {
      const query = new URLSearchParams(
        Object.entries(options)
          .filter(([, value]) => value !== undefined)
          .map(([key, value]) => [key, String(value)]),
      );
      return client.json(
        `/api/parity/cycle/${encodeURIComponent(workspaceId)}?${query}`,
        { method: "GET" },
      );
    },
  );
  register(
    "get_cycle",
    "Get a cycle's dates, progress, closing summary and daily history, filtered to projects you can currently read. historyAvailable is false when imported aggregate history cannot be safely filtered.",
    z.object({ id }),
    ({ id }) =>
      client.json(`/api/parity/cycle/item/${encodeURIComponent(id)}`, {
        method: "GET",
      }),
  );
  register(
    "update_task_cycle",
    "Assign an accepted task to a cycle in the same workspace, or clear its cycle with explicit null. Requires task update permission; disabled cycles allow clearing only.",
    z.object({ taskId: id, cycleId: id.nullable() }),
    ({ taskId, cycleId }) =>
      client.json(`/api/parity/task/${encodeURIComponent(taskId)}/cycle`, {
        method: "PUT",
        body: JSON.stringify({ cycleId }),
      }),
  );
  register(
    "update_task_estimate",
    "Set an estimate on the workspace scale, or clear it with explicit null. Linear: 1–5; Fibonacci: 1, 2, 3, 5, 8; T-shirt XS/S/M/L/XL: 1/2/3/5/8. The API enforces the configured scale. Unestimated tasks count as one point in charts.",
    z.object({
      taskId: id,
      estimate: z.number().int().min(1).max(8).nullable(),
    }),
    ({ taskId, estimate }) =>
      client.json(`/api/parity/task/${encodeURIComponent(taskId)}/estimate`, {
        method: "PUT",
        body: JSON.stringify({ estimate }),
      }),
  );
}

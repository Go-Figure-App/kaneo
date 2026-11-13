import { z } from "zod";
import type { ToolClient, ToolRegistrar } from "../register.js";
import { errorResult, textResult } from "../../utils/mcp-result.js";

export function registerTriageTools(server: ToolRegistrar, client: ToolClient) {
  const id = z.string().trim().min(1).max(128);
  function register<S extends z.ZodObject>(
    name: string,
    description: string,
    inputSchema: S,
    run: (args: z.output<S>) => Promise<unknown>,
  ) {
    server.registerTool(name, { description, inputSchema }, async (input) => {
      const args = inputSchema.safeParse(input);
      if (!args.success) return errorResult(z.prettifyError(args.error));
      try {
        return textResult(await run(args.data));
      } catch (error) {
        return errorResult(
          error instanceof Error ? error.message : String(error),
        );
      }
    });
  }
  register(
    "list_triage_items",
    "List pending triage items across readable projects. Requires the triage feature.",
    z.object({
      workspaceId: id,
      projectId: id.optional(),
      page: z.number().int().min(1).max(100_000).optional(),
      pageSize: z.number().int().min(1).max(100).optional(),
    }),
    ({ workspaceId, ...filters }) => {
      const query = new URLSearchParams(
        Object.entries(filters)
          .filter(([, value]) => value !== undefined)
          .map(([key, value]) => [key, String(value)]),
      );
      return client.json(
        `/api/parity/triage/${encodeURIComponent(workspaceId)}?${query}`,
        { method: "GET" },
      );
    },
  );
  register(
    "create_triage_item",
    "Submit a task to a project's triage inbox without adding it to the board.",
    z.object({
      projectId: id,
      title: z.string().trim().min(1).max(500),
      description: z.string().max(50_000).optional(),
    }),
    ({ projectId, ...body }) =>
      client.json(`/api/parity/triage/${encodeURIComponent(projectId)}`, {
        method: "POST",
        body: JSON.stringify(body),
      }),
  );
  register(
    "accept_triage_item",
    "Accept a pending item into a chosen project column, optionally assigning it and setting priority.",
    z.object({
      taskId: id,
      columnId: id,
      assigneeId: id.nullable().optional(),
      priority: z
        .enum(["no-priority", "low", "medium", "high", "urgent"])
        .optional(),
    }),
    ({ taskId, ...body }) =>
      client.json(
        `/api/parity/triage/item/${encodeURIComponent(taskId)}/accept`,
        { method: "POST", body: JSON.stringify(body) },
      ),
  );
  register(
    "decline_triage_item",
    "Decline a pending triage item with a required explanation, moving it to a canceled column.",
    z.object({
      taskId: id,
      comment: z.string().trim().min(1).max(10_000),
    }),
    ({ taskId, ...body }) =>
      client.json(
        `/api/parity/triage/item/${encodeURIComponent(taskId)}/decline`,
        { method: "POST", body: JSON.stringify(body) },
      ),
  );
}

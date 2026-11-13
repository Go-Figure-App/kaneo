import { z } from "zod";
import { errorResult, textResult } from "../../utils/mcp-result.js";
import type { ToolClient, ToolRegistrar } from "../register.js";

export function registerPlanningTools(
  server: ToolRegistrar,
  client: ToolClient,
) {
  const id = z.string().trim().min(1).max(128);
  const date = z.iso.date().nullable().optional();
  const segment = encodeURIComponent;
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
    "get_project_plan",
    "Get a readable project's status, lead, dates, milestones, progress and latest update.",
    z.object({ projectId: id }),
    ({ projectId }) =>
      client.json(`/api/parity/project-plan/${segment(projectId)}`, {
        method: "GET",
      }),
  );
  register(
    "update_project_plan",
    "Update project planning fields. Explicit null clears a lead or date; health is set by posting an update.",
    z.object({
      projectId: id,
      status: z
        .enum([
          "backlog",
          "planned",
          "started",
          "paused",
          "completed",
          "canceled",
        ])
        .optional(),
      leadId: id.nullable().optional(),
      startDate: date,
      targetDate: date,
      priority: z
        .enum(["no-priority", "low", "medium", "high", "urgent"])
        .optional(),
    }),
    ({ projectId, ...body }) =>
      client.json(`/api/parity/project-plan/${segment(projectId)}`, {
        method: "PUT",
        body: JSON.stringify(body),
      }),
  );
  register(
    "list_milestones",
    "List a readable project's milestones and their progress.",
    z.object({ projectId: id }),
    ({ projectId }) =>
      client.json(`/api/parity/milestone/${segment(projectId)}`, {
        method: "GET",
      }),
  );
  register(
    "create_status_update",
    "Post a Markdown project or initiative update and set its health.",
    z.object({
      parentType: z.enum(["project", "initiative"]),
      parentId: id,
      health: z.enum(["on_track", "at_risk", "off_track"]),
      body: z.string().trim().min(1).max(50_000),
    }),
    ({ parentType, parentId, ...body }) =>
      client.json(
        `/api/parity/status-update/${parentType}/${segment(parentId)}`,
        { method: "POST", body: JSON.stringify(body) },
      ),
  );
  register(
    "list_initiatives",
    "List workspace initiatives; project counts and progress include only readable projects.",
    z.object({
      workspaceId: id,
      page: z.number().int().min(1).max(100_000).optional(),
      pageSize: z.number().int().min(1).max(100).optional(),
      includeArchived: z.boolean().optional(),
    }),
    ({ workspaceId, ...options }) => {
      const query = new URLSearchParams(
        Object.entries(options)
          .filter(([, value]) => value !== undefined)
          .map(([key, value]) => [key, String(value)]),
      );
      return client.json(
        `/api/parity/initiative/${segment(workspaceId)}?${query}`,
        { method: "GET" },
      );
    },
  );
  register(
    "get_initiative",
    "Get an initiative's properties, progress, latest update and readable linked projects.",
    z.object({ id }),
    ({ id }) =>
      client.json(`/api/parity/initiative/item/${segment(id)}`, {
        method: "GET",
      }),
  );
  register(
    "create_initiative",
    "Create an initiative in a workspace. Requires project update permission.",
    z.object({
      workspaceId: id,
      name: z.string().trim().min(1).max(200),
      description: z.string().max(50_000).optional(),
      status: z.enum(["planned", "active", "completed"]).optional(),
      ownerId: id.nullable().optional(),
      targetDate: date,
    }),
    ({ workspaceId, ...body }) =>
      client.json(`/api/parity/initiative/${segment(workspaceId)}`, {
        method: "POST",
        body: JSON.stringify(body),
      }),
  );
  register(
    "add_project_to_initiative",
    "Link a readable project to an initiative in the same workspace; a project can belong to multiple initiatives.",
    z.object({
      initiativeId: id,
      projectId: id,
      position: z.number().int().min(0).max(1_000_000).optional(),
    }),
    ({ initiativeId, projectId, ...body }) =>
      client.json(
        `/api/parity/initiative/item/${segment(initiativeId)}/project/${segment(projectId)}`,
        { method: "POST", body: JSON.stringify(body) },
      ),
  );
}

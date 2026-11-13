import { z } from "zod";
import { errorResult, textResult } from "../../utils/mcp-result.js";
import type { ToolClient, ToolRegistrar } from "../register.js";
import { viewFilters } from "./view-filters.js";
export function registerViewTools(server: ToolRegistrar, client: ToolClient) {
  const id = z.string().min(1).max(128);
  const page = {
    page: z.number().int().min(1).max(100_000).optional(),
    pageSize: z.number().int().min(1).max(100).optional(),
  };
  function register<S extends z.ZodObject>(
    name: string,
    description: string,
    inputSchema: S,
    resource: "views" | "tasks",
  ) {
    server.registerTool(name, { description, inputSchema }, async (input) => {
      const parsed = inputSchema.safeParse(input);
      if (!parsed.success) return errorResult(z.prettifyError(parsed.error));
      const { workspaceId, ...options } = parsed.data;
      const query = new URLSearchParams(
        Object.entries(options)
          .filter(([, value]) => value !== undefined)
          .map(([key, value]) => [
            key,
            key === "filters" ? JSON.stringify(value) : String(value),
          ]),
      );
      try {
        return textResult(
          await client.json(
            `/api/parity/${resource}/${encodeURIComponent(String(workspaceId))}?${query}`,
            { method: "GET" },
          ),
        );
      } catch (error) {
        return errorResult(
          error instanceof Error ? error.message : String(error),
        );
      }
    });
  }
  register(
    "list_saved_views",
    "List your personal views and readable shared workspace views. Each view contains filters and display options; pass its filters and optional projectId to list_workspace_tasks. Results are paginated.",
    z.object({ workspaceId: id, ...page }),
    "views",
  );
  register(
    "list_workspace_tasks",
    "List accepted issues across readable projects. Filters are ANDed; each values list matches any value, and null matches unset values. Date filters use the workspace calendar and YYYY-MM-DD. before/after exclude the selected day; estimate comparisons are numeric. Creator comes from recorded creation activity, or null when unavailable. Search matches issue title or project identifier. Group counts must describe loaded pages only.",
    z.object({
      workspaceId: id,
      ...page,
      filters: viewFilters.optional(),
      projectId: id.optional(),
      search: z.string().trim().max(200).optional(),
      orderBy: z.enum(["priority", "created", "updated", "due"]).optional(),
      direction: z.enum(["asc", "desc"]).optional(),
    }),
    "tasks",
  );
}

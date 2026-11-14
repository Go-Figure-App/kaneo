import { createRoute, jsonResponse, z } from "../../openapi";
import { requireWorkspacePermission } from "../../utils/require-workspace-permission";
import { workspaceAccess } from "../../utils/workspace-access-middleware";
import { requireParity } from "../foundation/features";
import { actor } from "../planning/access";
import { id } from "../planning/schema";
import { errors, planningRouter } from "../planning/routes/shared";
import { workspaceTaskQuery, workspaceTaskSchema } from "./schema";
import { listWorkspaceTasks } from "./task-read";
import { viewOptions } from "./options";
import { estimateScales } from "../cycles/estimates";

export const readViews = [
  requireParity("views"),
  workspaceAccess.fromParam(),
  requireWorkspacePermission({
    workspace: ["read"],
    project: ["read"],
    task: ["read"],
  }),
] as const;
const route = createRoute({
  method: "get",
  path: "/{workspaceId}",
  operationId: "listWorkspaceTasks",
  tags: ["Views"],
  summary: "List issues across readable projects with rich filters",
  middleware: [...readViews],
  request: { params: z.object({ workspaceId: id }), query: workspaceTaskQuery },
  responses: {
    200: jsonResponse(
      "Workspace issues",
      z.object({
        items: z.array(workspaceTaskSchema),
        page: z.number(),
        pageSize: z.number(),
        hasMore: z.boolean(),
        timeZone: z.string(),
      }),
    ),
    ...errors,
  },
});
const options = createRoute({
  method: "get",
  path: "/{workspaceId}/options",
  operationId: "getWorkspaceTaskOptions",
  tags: ["Views"],
  summary: "Read accessible filter choices",
  middleware: [...readViews],
  request: {
    params: z.object({ workspaceId: id }),
    query: z.strictObject({ projectId: id.optional() }),
  },
  responses: {
    200: jsonResponse(
      "Filter choices",
      z.object({
        states: z.array(z.object({ name: z.string() })),
        initiatives: z.array(z.object({ id, name: z.string() })),
        projects: z.array(z.object({ id, name: z.string() })),
        users: z.array(z.object({ id, name: z.string() })),
        labels: z.array(z.object({ name: z.string(), color: z.string() })),
        cycles: z.array(
          z.object({ id, name: z.string().nullable(), number: z.number() }),
        ),
        milestones: z.array(
          z.object({
            id,
            name: z.string(),
            projectId: id,
            projectName: z.string(),
          }),
        ),
        estimateScale: z.enum(estimateScales),
        timeZone: z.string(),
        truncated: z.boolean(),
      }),
    ),
    ...errors,
  },
});
export default planningRouter()
  .openapi(options, async (c) =>
    c.json(await viewOptions(actor(c), c.req.valid("query").projectId), 200),
  )
  .openapi(route, async (c) =>
    c.json(await listWorkspaceTasks(actor(c), c.req.valid("query")), 200),
  );

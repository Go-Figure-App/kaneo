import { HTTPException } from "hono/http-exception";
import {
  apiRouter,
  createRoute,
  errorResponse,
  jsonResponse,
  z,
  type BaseVariables,
} from "../../openapi";
import {
  hasWorkspacePermission,
  requireWorkspacePermission,
} from "../../utils/require-workspace-permission";
import { workspaceAccess } from "../../utils/workspace-access-middleware";
import { requireParity } from "../foundation/features";
import { taskSchema } from "../../task/response";
import { acceptTriage } from "./controllers/accept";
import { closeTriage } from "./controllers/close";
import { createTriageItem } from "./controllers/create";
import { listTriage, triageCount, triageProjects } from "./controllers/list";
import {
  getTriageSettings,
  updateTriageSettings,
} from "./controllers/settings";
import { snoozeTriage } from "./controllers/snooze";
import {
  acceptBody,
  createTriageBody,
  declineBody,
  duplicateBody,
  id,
  listQuery,
  settingsBody,
  settingsSchema,
  snoozeBody,
  triageItemSchema,
} from "./schema";

const errors = {
  400: errorResponse("Invalid request"),
  401: errorResponse("Authentication required"),
  403: errorResponse("Insufficient permission or project access"),
  404: errorResponse("Resource unavailable or feature disabled"),
  409: errorResponse("Item already triaged or configuration changed"),
};
const body = <T extends z.ZodType>(schema: T) => ({
  required: true,
  content: { "application/json": { schema } },
});
const workspaceParams = z.object({ workspaceId: id });
const projectParams = z.object({ projectId: id });
const taskParams = z.object({ taskId: id });
const read = [
  requireParity("triage"),
  workspaceAccess.fromParam(),
  requireWorkspacePermission({
    workspace: ["read"],
    project: ["read"],
    task: ["read"],
  }),
] as const;
const mutate = [
  requireParity("triage"),
  workspaceAccess.fromTaskId(),
  requireWorkspacePermission({ project: ["read"], task: ["read", "update"] }),
] as const;
const settings = [
  requireParity("triage"),
  workspaceAccess.fromProject("projectId"),
  requireWorkspacePermission({ project: ["read", "update"] }),
] as const;
const itemResponses = {
  200: jsonResponse("Updated triage item", z.object({ id })),
  ...errors,
};
const listRoute = createRoute({
  method: "get",
  path: "/{workspaceId}",
  operationId: "listTriageItems",
  summary: "List pending items across readable projects",
  tags: ["Triage"],
  middleware: [...read],
  request: { params: workspaceParams, query: listQuery },
  responses: {
    200: jsonResponse(
      "Pending triage items",
      z.object({
        items: z.array(triageItemSchema),
        total: z.number(),
        page: z.number(),
        pageSize: z.number(),
      }),
    ),
    ...errors,
  },
});
const countRoute = createRoute({
  method: "get",
  path: "/{workspaceId}/count",
  operationId: "countTriageItems",
  summary: "Count pending items across readable projects",
  tags: ["Triage"],
  middleware: [...read],
  request: { params: workspaceParams },
  responses: {
    200: jsonResponse("Pending triage count", z.object({ count: z.number() })),
    ...errors,
  },
});
const projectsRoute = createRoute({
  method: "get",
  path: "/{workspaceId}/projects",
  operationId: "getTriageProjects",
  summary: "List readable projects accepting submissions",
  tags: ["Triage"],
  middleware: [...read],
  request: { params: workspaceParams },
  responses: {
    200: jsonResponse(
      "Triage projects",
      z.array(z.object({ id, name: z.string(), slug: z.string() })),
    ),
    ...errors,
  },
});
const createItemRoute = createRoute({
  method: "post",
  path: "/project/{projectId}",
  operationId: "createTriageItem",
  summary: "Submit a task for triage",
  tags: ["Triage"],
  middleware: [
    requireParity("triage"),
    workspaceAccess.fromProject("projectId"),
    requireWorkspacePermission({ project: ["read"], task: ["create"] }),
  ] as const,
  request: { params: projectParams, body: body(createTriageBody) },
  responses: {
    200: jsonResponse("Created pending task", taskSchema),
    ...errors,
  },
});
const getSettingsRoute = createRoute({
  method: "get",
  path: "/settings/{projectId}",
  operationId: "getTriageSettings",
  summary: "Get project triage settings and intake token",
  tags: ["Triage"],
  middleware: [...settings],
  request: { params: projectParams },
  responses: {
    200: jsonResponse("Triage settings", settingsSchema),
    ...errors,
  },
});
const updateSettingsRoute = createRoute({
  method: "put",
  path: "/settings/{projectId}",
  operationId: "updateTriageSettings",
  summary: "Configure triage, owner, intake token and integration routing",
  tags: ["Triage"],
  middleware: [...settings],
  request: { params: projectParams, body: body(settingsBody) },
  responses: {
    200: jsonResponse("Triage settings", settingsSchema),
    ...errors,
  },
});
const acceptRoute = createRoute({
  method: "post",
  path: "/item/{taskId}/accept",
  operationId: "acceptTriageItem",
  summary: "Accept a pending item into a project column",
  tags: ["Triage"],
  middleware: [...mutate],
  request: { params: taskParams, body: body(acceptBody) },
  responses: itemResponses,
});
const declineRoute = createRoute({
  method: "post",
  path: "/item/{taskId}/decline",
  operationId: "declineTriageItem",
  summary: "Decline an item with a comment",
  tags: ["Triage"],
  middleware: [...mutate],
  request: { params: taskParams, body: body(declineBody) },
  responses: itemResponses,
});
const duplicateRoute = createRoute({
  method: "post",
  path: "/item/{taskId}/duplicate",
  operationId: "duplicateTriageItem",
  summary: "Mark an item as duplicate and notify its reporter",
  tags: ["Triage"],
  middleware: [...mutate],
  request: { params: taskParams, body: body(duplicateBody) },
  responses: itemResponses,
});
const snoozeRoute = createRoute({
  method: "post",
  path: "/item/{taskId}/snooze",
  operationId: "snoozeTriageItem",
  summary: "Snooze a pending item for up to one year",
  tags: ["Triage"],
  middleware: [...mutate],
  request: { params: taskParams, body: body(snoozeBody) },
  responses: itemResponses,
});

export default apiRouter<BaseVariables & { workspaceId: string }>()
  .openapi(listRoute, async (c) =>
    c.json(
      await listTriage(
        c.req.valid("param").workspaceId,
        c.get("userId"),
        c.req.valid("query"),
      ),
      200,
    ),
  )
  .openapi(countRoute, async (c) =>
    c.json(
      {
        count: await triageCount(
          c.req.valid("param").workspaceId,
          c.get("userId"),
        ),
      },
      200,
    ),
  )
  .openapi(projectsRoute, async (c) =>
    c.json(
      await triageProjects(c.req.valid("param").workspaceId, c.get("userId")),
      200,
    ),
  )
  .openapi(createItemRoute, async (c) => {
    const input = c.req.valid("json");
    if (
      input.userId &&
      !(await hasWorkspacePermission(c, { task: ["assign"] }))
    )
      throw new HTTPException(403, {
        message: "Task assignment permission required",
      });
    return c.json(
      await createTriageItem(c.req.valid("param").projectId, input, {
        userId: c.get("userId"),
        workspaceId: c.get("workspaceId"),
      }),
      200,
    );
  })
  .openapi(getSettingsRoute, async (c) =>
    c.json(
      await getTriageSettings(
        c.req.valid("param").projectId,
        c.get("workspaceId"),
      ),
      200,
    ),
  )
  .openapi(updateSettingsRoute, async (c) => {
    const input = c.req.valid("json");
    if (
      input.integrations?.length &&
      !(await hasWorkspacePermission(c, { workspace: ["manage_settings"] }))
    )
      throw new HTTPException(403, {
        message: "Managing integrations requires workspace settings permission",
      });
    return c.json(
      await updateTriageSettings(
        c.req.valid("param").projectId,
        c.get("workspaceId"),
        input,
      ),
      200,
    );
  })
  .openapi(acceptRoute, async (c) => {
    const input = c.req.valid("json");
    if (
      input.assigneeId !== undefined &&
      !(await hasWorkspacePermission(c, { task: ["assign"] }))
    )
      throw new HTTPException(403, {
        message: "Task assignment permission required",
      });
    return c.json(
      await acceptTriage(
        c.req.valid("param").taskId,
        { userId: c.get("userId"), workspaceId: c.get("workspaceId") },
        input,
      ),
      200,
    );
  })
  .openapi(declineRoute, async (c) =>
    c.json(
      await closeTriage(
        c.req.valid("param").taskId,
        { userId: c.get("userId"), workspaceId: c.get("workspaceId") },
        c.req.valid("json"),
      ),
      200,
    ),
  )
  .openapi(duplicateRoute, async (c) =>
    c.json(
      await closeTriage(
        c.req.valid("param").taskId,
        { userId: c.get("userId"), workspaceId: c.get("workspaceId") },
        c.req.valid("json"),
      ),
      200,
    ),
  )
  .openapi(snoozeRoute, async (c) =>
    c.json(
      await snoozeTriage(
        c.req.valid("param").taskId,
        { userId: c.get("userId"), workspaceId: c.get("workspaceId") },
        new Date(c.req.valid("json").until),
      ),
      200,
    ),
  );

import { createRoute, jsonResponse, z } from "../../openapi";
import { requireWorkspacePermission } from "../../utils/require-workspace-permission";
import { workspaceAccess } from "../../utils/workspace-access-middleware";
import { requireParity } from "../foundation/features";
import { actor } from "../planning/access";
import { body, errors, planningRouter } from "../planning/routes/shared";
import { id } from "../planning/schema";
import { cycleAccess } from "./access";
import { editCycle } from "./edit";
import { getCycle, listCycles } from "./read";
import {
  cycleDetailSchema,
  cyclePatch,
  cycleQuery,
  cycleSchema,
  cycleTaskQuery,
  cycleTaskSchema,
  settingsBody,
  settingsSchema,
} from "./schema";
import { cycleSettings } from "./settings-read";
import { updateCycleSettings } from "./settings-write";
import { getCycleTasks } from "./tasks";
import { projectCycleTasks } from "./project-tasks";

const workspace = z.strictObject({ workspaceId: id });
const item = z.strictObject({ id });
const readSettings = [
  requireParity("cycles"),
  workspaceAccess.fromParam(),
  requireWorkspacePermission({ workspace: ["read"] }),
] as const;
const readers = requireWorkspacePermission({
  workspace: ["read"],
  project: ["read"],
  task: ["read"],
});
const readItem = [requireParity("cycles"), cycleAccess, readers] as const;
const page = z.strictObject({
  page: z.number(),
  pageSize: z.number(),
  hasMore: z.boolean(),
});
const getSettings = createRoute({
  method: "get",
  path: "/settings/{workspaceId}",
  operationId: "getCycleSettings",
  tags: ["Cycles"],
  summary: "Get workspace cycle cadence and estimate scale",
  middleware: [...readSettings],
  request: { params: workspace },
  responses: { 200: jsonResponse("Cycle settings", settingsSchema), ...errors },
});
const setSettings = createRoute({
  method: "put",
  path: "/settings/{workspaceId}",
  operationId: "updateCycleSettings",
  tags: ["Cycles"],
  summary: "Configure automatic cycles, timezone and estimates",
  middleware: [
    ...readSettings,
    requireWorkspacePermission({ workspace: ["manage_settings"] }),
  ],
  request: { params: workspace, body: body(settingsBody) },
  responses: { 200: jsonResponse("Cycle settings", settingsSchema), ...errors },
});
const list = createRoute({
  method: "get",
  path: "/{workspaceId}",
  operationId: "listCycles",
  tags: ["Cycles"],
  summary: "List workspace cycles with progress from readable projects",
  middleware: [...readSettings, readers],
  request: { params: workspace, query: cycleQuery },
  responses: {
    200: jsonResponse(
      "Cycles",
      page.extend({ items: z.array(cycleSchema), settings: settingsSchema }),
    ),
    ...errors,
  },
});
const get = createRoute({
  method: "get",
  path: "/item/{id}",
  operationId: "getCycle",
  tags: ["Cycles"],
  summary: "Get a cycle and its history filtered by current project access",
  middleware: [...readItem],
  request: { params: item },
  responses: { 200: jsonResponse("Cycle", cycleDetailSchema), ...errors },
});
const update = createRoute({
  method: "put",
  path: "/item/{id}",
  operationId: "updateCycle",
  tags: ["Cycles"],
  summary: "Rename a cycle or edit upcoming cycle dates",
  middleware: [
    ...readItem,
    requireWorkspacePermission({ project: ["update"] }),
  ],
  request: { params: item, body: body(cyclePatch) },
  responses: { 200: jsonResponse("Cycle", cycleDetailSchema), ...errors },
});
const tasks = createRoute({
  method: "get",
  path: "/item/{id}/tasks",
  operationId: "getCycleTasks",
  tags: ["Cycles"],
  summary: "List cycle tasks across readable projects with filters",
  middleware: [...readItem],
  request: { params: item, query: cycleTaskQuery },
  responses: {
    200: jsonResponse(
      "Cycle tasks",
      page.extend({ items: z.array(cycleTaskSchema) }),
    ),
    ...errors,
  },
});
const projectTasks = createRoute({
  method: "get",
  path: "/project/{projectId}/tasks",
  operationId: "getProjectCycleTasks",
  tags: ["Cycles"],
  summary:
    "Get compact cycle assignments for a readable project's board and list",
  middleware: [
    requireParity("cycles"),
    workspaceAccess.fromProjectId(),
    readers,
  ],
  request: { params: z.strictObject({ projectId: id }) },
  responses: {
    200: jsonResponse(
      "Project cycle assignments",
      z.strictObject({
        currentCycleId: id.nullable(),
        items: z.array(z.strictObject({ taskId: id, cycleId: id })),
      }),
    ),
    ...errors,
  },
});
export default planningRouter()
  .openapi(projectTasks, async (c) =>
    c.json(
      await projectCycleTasks(c.req.valid("param").projectId, actor(c)),
      200,
    ),
  )
  .openapi(getSettings, async (c) =>
    c.json(await cycleSettings(c.req.valid("param").workspaceId), 200),
  )
  .openapi(setSettings, async (c) =>
    c.json(await updateCycleSettings(actor(c), c.req.valid("json")), 200),
  )
  .openapi(list, async (c) =>
    c.json(await listCycles(actor(c), c.req.valid("query")), 200),
  )
  .openapi(get, async (c) =>
    c.json(await getCycle(c.req.valid("param").id, actor(c)), 200),
  )
  .openapi(update, async (c) =>
    c.json(
      await editCycle(c.req.valid("param").id, actor(c), c.req.valid("json")),
      200,
    ),
  )
  .openapi(tasks, async (c) =>
    c.json(
      await getCycleTasks(
        c.req.valid("param").id,
        actor(c),
        c.req.valid("query"),
      ),
      200,
    ),
  );

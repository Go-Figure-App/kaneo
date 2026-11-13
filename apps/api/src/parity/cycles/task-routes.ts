import { createRoute, jsonResponse, z } from "../../openapi";
import { HTTPException } from "hono/http-exception";
import { requireWorkspacePermission } from "../../utils/require-workspace-permission";
import { workspaceAccess } from "../../utils/workspace-access-middleware";
import { requireParity } from "../foundation/features";
import { actor } from "../planning/access";
import { body, errors, planningRouter } from "../planning/routes/shared";
import { id } from "../planning/schema";
import { getTaskCycleProperties } from "./task-read";
import { bulkCycleBody, taskCycleProperties } from "./task-schema";
import { mutateCycleTasks } from "./task-write";

const params = z.strictObject({ taskId: id });
const read = [
  requireParity("cycles"),
  workspaceAccess.fromTaskId(),
  requireWorkspacePermission({ project: ["read"], task: ["read"] }),
] as const;
const write = [
  ...read,
  requireWorkspacePermission({ task: ["update"] }),
] as const;
const responses = {
  200: jsonResponse("Task cycle and estimate", taskCycleProperties),
  ...errors,
};
const get = createRoute({
  method: "get",
  path: "/{taskId}/cycle-properties",
  operationId: "getTaskCycleProperties",
  tags: ["Cycles"],
  summary: "Get a task's cycle, estimate and workspace scale",
  middleware: [...read],
  request: { params },
  responses,
});
const setCycle = createRoute({
  method: "put",
  path: "/{taskId}/cycle",
  operationId: "updateTaskCycle",
  tags: ["Cycles"],
  summary: "Set or clear a task's cycle",
  middleware: [...write],
  request: { params, body: body(z.strictObject({ cycleId: id.nullable() })) },
  responses,
});
const setEstimate = createRoute({
  method: "put",
  path: "/{taskId}/estimate",
  operationId: "updateTaskEstimate",
  tags: ["Cycles"],
  summary: "Set or clear a task's estimate on the workspace scale",
  middleware: [...write],
  request: {
    params,
    body: body(
      z.strictObject({ estimate: z.number().int().min(0).max(8).nullable() }),
    ),
  },
  responses,
});
const bulk = createRoute({
  method: "patch",
  path: "/bulk",
  operationId: "bulkUpdatePlanningTasks",
  tags: ["Cycles"],
  summary:
    "Atomically update cycles, estimates or milestones on up to 100 tasks",
  middleware: [
    requireParity("foundation"),
    async (c, next) => {
      // Bound the lookup before the shared authorization middleware reads IDs.
      if (
        !bulkCycleBody.safeParse(await c.req.json().catch(() => null)).success
      )
        throw new HTTPException(400, { message: "Invalid bulk task mutation" });
      await next();
    },
    workspaceAccess.fromTasks(),
    requireWorkspacePermission({ project: ["read"], task: ["read", "update"] }),
  ],
  request: { body: body(bulkCycleBody) },
  responses: {
    200: jsonResponse(
      "Changed tasks",
      z.strictObject({ taskIds: z.array(id), updated: z.number() }),
    ),
    ...errors,
  },
});
export default planningRouter()
  .openapi(bulk, async (c) =>
    c.json(await mutateCycleTasks(actor(c), c.req.valid("json")), 200),
  )
  .openapi(get, async (c) =>
    c.json(
      await getTaskCycleProperties(c.req.valid("param").taskId, actor(c)),
      200,
    ),
  )
  .openapi(setCycle, async (c) => {
    const taskId = c.req.valid("param").taskId;
    await mutateCycleTasks(actor(c), {
      taskIds: [taskId],
      operation: "updateCycle",
      value: c.req.valid("json").cycleId,
    });
    return c.json(await getTaskCycleProperties(taskId, actor(c)), 200);
  })
  .openapi(setEstimate, async (c) => {
    const taskId = c.req.valid("param").taskId;
    await mutateCycleTasks(actor(c), {
      taskIds: [taskId],
      operation: "updateEstimate",
      value: c.req.valid("json").estimate,
    });
    return c.json(await getTaskCycleProperties(taskId, actor(c)), 200);
  });

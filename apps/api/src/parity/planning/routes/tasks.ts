import { createRoute, jsonResponse, z } from "../../../openapi";
import { requireWorkspacePermission } from "../../../utils/require-workspace-permission";
import { workspaceAccess } from "../../../utils/workspace-access-middleware";
import { requireParity } from "../../foundation/features";
import { actor } from "../access";
import { getTaskMilestone, setTaskMilestone } from "../milestones";
import { id } from "../schema";
import { body, errors, planningRouter } from "./shared";

const params = z.object({ taskId: id });
const response = z.object({
  taskId: id,
  milestoneId: id.nullable(),
  name: z.string().nullable(),
});
const read = [
  requireParity("projects"),
  workspaceAccess.fromTaskId(),
  requireWorkspacePermission({ project: ["read"], task: ["read"] }),
] as const;
const get = createRoute({
  method: "get",
  path: "/{taskId}/milestone",
  operationId: "getTaskMilestone",
  tags: ["Project planning"],
  summary: "Get the task's current project milestone",
  middleware: [...read],
  request: { params },
  responses: { 200: jsonResponse("Task milestone", response), ...errors },
});
const set = createRoute({
  method: "put",
  path: "/{taskId}/milestone",
  operationId: "setTaskMilestone",
  tags: ["Project planning"],
  summary: "Set or clear a task milestone",
  middleware: [...read, requireWorkspacePermission({ task: ["update"] })],
  request: { params, body: body(z.object({ milestoneId: id.nullable() })) },
  responses: { 200: jsonResponse("Task milestone", response), ...errors },
});
export default planningRouter()
  .openapi(get, async (c) =>
    c.json(await getTaskMilestone(c.req.valid("param").taskId, actor(c)), 200),
  )
  .openapi(set, async (c) =>
    c.json(
      await setTaskMilestone(
        c.req.valid("param").taskId,
        actor(c),
        c.req.valid("json").milestoneId,
      ),
      200,
    ),
  );

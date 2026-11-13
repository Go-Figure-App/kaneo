import { createRoute, jsonResponse, z } from "../../../openapi";
import { requireWorkspacePermission } from "../../../utils/require-workspace-permission";
import { actor, planningAccess } from "../access";
import { changeMilestone, createMilestone } from "../milestones";
import { listMilestones } from "../project-read";
import { id, milestoneBody, milestonePatch, milestoneSchema } from "../schema";
import {
  body,
  errors,
  planningRouter,
  readProject,
  writeProject,
} from "./shared";

const params = z.object({ projectId: id });
const itemParams = z.object({ id });
const write = [
  planningAccess("milestone"),
  requireWorkspacePermission({ project: ["read", "update"], task: ["read"] }),
] as const;
const list = createRoute({
  method: "get",
  path: "/{projectId}",
  operationId: "listMilestones",
  tags: ["Project planning"],
  summary: "List a project's milestones and progress",
  middleware: [...readProject],
  request: { params },
  responses: {
    200: jsonResponse("Milestones", z.array(milestoneSchema)),
    ...errors,
  },
});
const create = createRoute({
  method: "post",
  path: "/{projectId}",
  operationId: "createMilestone",
  tags: ["Project planning"],
  summary: "Create a project milestone",
  middleware: [...writeProject],
  request: { params, body: body(milestoneBody) },
  responses: {
    200: jsonResponse("Created milestone", milestoneSchema),
    ...errors,
  },
});
const update = createRoute({
  method: "put",
  path: "/item/{id}",
  operationId: "updateMilestone",
  tags: ["Project planning"],
  summary: "Update or reorder a milestone",
  middleware: [...write],
  request: { params: itemParams, body: body(milestonePatch) },
  responses: {
    200: jsonResponse("Updated milestone", milestoneSchema),
    ...errors,
  },
});
const remove = createRoute({
  method: "delete",
  path: "/item/{id}",
  operationId: "deleteMilestone",
  tags: ["Project planning"],
  summary: "Delete a milestone and clear task assignments",
  middleware: [...write],
  request: { params: itemParams },
  responses: {
    200: jsonResponse("Deleted milestone", z.object({ id })),
    ...errors,
  },
});

export default planningRouter()
  .openapi(list, async (c) =>
    c.json(await listMilestones(c.req.valid("param").projectId, actor(c)), 200),
  )
  .openapi(create, async (c) =>
    c.json(
      await createMilestone(
        c.req.valid("param").projectId,
        actor(c),
        c.req.valid("json"),
      ),
      200,
    ),
  )
  .openapi(update, async (c) =>
    c.json(
      (await changeMilestone(
        c.req.valid("param").id,
        actor(c),
        c.req.valid("json"),
      ))!,
      200,
    ),
  )
  .openapi(remove, async (c) => {
    const { id } = c.req.valid("param");
    await changeMilestone(id, actor(c), null);
    return c.json({ id }, 200);
  });

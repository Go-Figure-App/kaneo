import { createRoute, jsonResponse, z } from "../../../openapi";
import { requireWorkspacePermission } from "../../../utils/require-workspace-permission";
import { actor, planningAccess } from "../access";
import {
  id,
  pageQuery,
  parentType,
  statusUpdateSchema,
  updateBody,
} from "../schema";
import { createStatusUpdate, listStatusUpdates } from "../status-updates";
import { body, errors, planningRouter } from "./shared";

const params = z.object({ parentType, parentId: id });
const read = [
  planningAccess("status-update"),
  requireWorkspacePermission({ workspace: ["read"], project: ["read"] }),
] as const;
const list = createRoute({
  method: "get",
  path: "/{parentType}/{parentId}",
  operationId: "listStatusUpdates",
  tags: ["Project planning"],
  summary: "Read a project or initiative update feed",
  middleware: [...read],
  request: { params, query: pageQuery },
  responses: {
    200: jsonResponse(
      "Status updates",
      z.object({
        items: z.array(statusUpdateSchema),
        hasMore: z.boolean(),
        page: z.number(),
        pageSize: z.number(),
      }),
    ),
    ...errors,
  },
});
const create = createRoute({
  method: "post",
  path: "/{parentType}/{parentId}",
  operationId: "createStatusUpdate",
  tags: ["Project planning"],
  summary: "Post an update and set the parent's health",
  middleware: [...read, requireWorkspacePermission({ project: ["update"] })],
  request: { params, body: body(updateBody) },
  responses: {
    200: jsonResponse("Created status update", statusUpdateSchema),
    ...errors,
  },
});
export default planningRouter()
  .openapi(list, async (c) => {
    const { parentType, parentId } = c.req.valid("param");
    const { page, pageSize } = c.req.valid("query");
    return c.json(
      await listStatusUpdates(parentType, parentId, actor(c), page, pageSize),
      200,
    );
  })
  .openapi(create, async (c) => {
    const { parentType, parentId } = c.req.valid("param");
    return c.json(
      await createStatusUpdate(
        parentType,
        parentId,
        actor(c),
        c.req.valid("json"),
      ),
      200,
    );
  });

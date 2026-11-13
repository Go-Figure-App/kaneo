import { HTTPException } from "hono/http-exception";
import { createRoute, jsonResponse, z } from "../../../openapi";
import {
  hasWorkspacePermission,
  requireWorkspacePermission,
} from "../../../utils/require-workspace-permission";
import { workspaceAccess } from "../../../utils/workspace-access-middleware";
import { requireParity } from "../../foundation/features";
import { actor, planningAccess } from "../access";
import { getInitiative, listInitiatives } from "../initiative-read";
import {
  createInitiative,
  deleteInitiative,
  linkProject,
  reorderInitiatives,
  updateInitiative,
} from "../initiative-write";
import {
  id,
  initiativeBody,
  initiativePatch,
  initiativeSchema,
  pageQuery,
  projectSummarySchema,
} from "../schema";
import { body, errors, planningRouter } from "./shared";

const params = z.object({ workspaceId: id });
const itemParams = z.object({ id });
const linkParams = itemParams.extend({ projectId: id });
const detail = initiativeSchema.extend({
  projects: z.array(projectSummarySchema),
});
const permissions = requireWorkspacePermission({
  workspace: ["read"],
  project: ["read"],
  task: ["read"],
});
const read = [
  requireParity("initiatives"),
  workspaceAccess.fromParam(),
  permissions,
] as const;
const itemRead = [planningAccess("initiative"), permissions] as const;
const write = requireWorkspacePermission({ project: ["update"] });
const list = createRoute({
  method: "get",
  path: "/{workspaceId}",
  operationId: "listInitiatives",
  tags: ["Initiatives"],
  summary: "List initiatives with progress across readable projects",
  middleware: [...read],
  request: {
    params,
    query: pageQuery.extend({
      includeArchived: z.enum(["true", "false"]).default("false"),
    }),
  },
  responses: {
    200: jsonResponse(
      "Initiatives",
      z.object({
        items: z.array(initiativeSchema),
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
  path: "/{workspaceId}",
  operationId: "createInitiative",
  tags: ["Initiatives"],
  summary: "Create an initiative",
  middleware: [...read, write],
  request: { params, body: body(initiativeBody) },
  responses: { 200: jsonResponse("Created initiative", detail), ...errors },
});
const get = createRoute({
  method: "get",
  path: "/item/{id}",
  operationId: "getInitiative",
  tags: ["Initiatives"],
  summary: "Get an initiative and its readable projects",
  middleware: [...itemRead],
  request: { params: itemParams },
  responses: { 200: jsonResponse("Initiative", detail), ...errors },
});
const update = createRoute({
  method: "put",
  path: "/item/{id}",
  operationId: "updateInitiative",
  tags: ["Initiatives"],
  summary: "Edit, archive or restore an initiative",
  middleware: [...itemRead, write],
  request: { params: itemParams, body: body(initiativePatch) },
  responses: { 200: jsonResponse("Updated initiative", detail), ...errors },
});
const remove = createRoute({
  method: "delete",
  path: "/item/{id}",
  operationId: "deleteInitiative",
  tags: ["Initiatives"],
  summary: "Delete an initiative, preserving its projects",
  middleware: [
    ...itemRead,
    requireWorkspacePermission({ workspace: ["manage_settings"] }),
  ],
  request: { params: itemParams },
  responses: {
    200: jsonResponse("Deleted initiative", z.object({ id })),
    ...errors,
  },
});
const link = createRoute({
  method: "post",
  path: "/item/{id}/project/{projectId}",
  operationId: "addProjectToInitiative",
  tags: ["Initiatives"],
  summary: "Link or reorder a readable project in an initiative",
  middleware: [...itemRead, write],
  request: {
    params: linkParams,
    body: body(
      z.object({ position: z.number().int().min(0).max(1_000_000).optional() }),
    ),
  },
  responses: { 200: jsonResponse("Linked project", linkParams), ...errors },
});
const unlink = createRoute({
  method: "delete",
  path: "/item/{id}/project/{projectId}",
  operationId: "removeProjectFromInitiative",
  tags: ["Initiatives"],
  summary: "Unlink a project from an initiative",
  middleware: [...itemRead, write],
  request: { params: linkParams },
  responses: { 200: jsonResponse("Unlinked project", linkParams), ...errors },
});
const reorder = createRoute({
  method: "post",
  path: "/{workspaceId}/reorder",
  operationId: "reorderInitiatives",
  tags: ["Initiatives"],
  summary: "Order the workspace's active initiatives",
  middleware: [...read, write],
  request: { params, body: body(z.object({ ids: z.array(id).max(1000) })) },
  responses: {
    200: jsonResponse("Initiative order", z.object({ ids: z.array(id) })),
    ...errors,
  },
});

export default planningRouter()
  .openapi(list, async (c) => {
    const { page, pageSize, includeArchived } = c.req.valid("query");
    return c.json(
      await listInitiatives(
        actor(c),
        page,
        pageSize,
        includeArchived === "true",
      ),
      200,
    );
  })
  .openapi(create, async (c) =>
    c.json(await createInitiative(actor(c), c.req.valid("json")), 200),
  )
  .openapi(get, async (c) =>
    c.json(await getInitiative(c.req.valid("param").id, actor(c)), 200),
  )
  .openapi(update, async (c) => {
    const input = c.req.valid("json");
    if (
      input.archived !== undefined &&
      !(await hasWorkspacePermission(c, { workspace: ["manage_settings"] }))
    )
      throw new HTTPException(403, {
        message: "Archiving initiatives requires workspace settings permission",
      });
    return c.json(
      await updateInitiative(c.req.valid("param").id, actor(c), input),
      200,
    );
  })
  .openapi(remove, async (c) =>
    c.json(await deleteInitiative(c.req.valid("param").id, actor(c)), 200),
  )
  .openapi(link, async (c) => {
    const { id, projectId } = c.req.valid("param");
    return c.json(
      await linkProject(
        id,
        projectId,
        actor(c),
        true,
        c.req.valid("json").position,
      ),
      200,
    );
  })
  .openapi(unlink, async (c) => {
    const { id, projectId } = c.req.valid("param");
    return c.json(await linkProject(id, projectId, actor(c), false), 200);
  })
  .openapi(reorder, async (c) =>
    c.json(await reorderInitiatives(actor(c), c.req.valid("json").ids), 200),
  );

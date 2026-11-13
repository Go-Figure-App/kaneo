import { createRoute, jsonResponse, z } from "../../openapi";
import { hasWorkspacePermission } from "../../utils/require-workspace-permission";
import { actor } from "../planning/access";
import { id, pageQuery } from "../planning/schema";
import { body, errors, planningRouter } from "../planning/routes/shared";
import { savedViewBody, savedViewSchema } from "./schema";
import {
  deleteSavedView,
  getSavedView,
  listSavedViews,
  saveView,
} from "./saved-views";
import { readViews } from "./task-routes";
import { requirePersonalViewWrite } from "./personal-write";
const params = z.object({ workspaceId: id });
const item = params.extend({ id });
const shared = { tags: ["Views"], middleware: [...readViews] };
const list = createRoute({
  ...shared,
  method: "get",
  path: "/{workspaceId}",
  operationId: "listSavedViews",
  summary: "List personal and shared readable views",
  request: { params, query: pageQuery.strict() },
  responses: {
    200: jsonResponse(
      "Saved views",
      z.object({
        items: z.array(savedViewSchema),
        page: z.number(),
        pageSize: z.number(),
        hasMore: z.boolean(),
      }),
    ),
    ...errors,
  },
});
const get = createRoute({
  ...shared,
  method: "get",
  path: "/{workspaceId}/{id}",
  operationId: "getSavedView",
  summary: "Read a saved view",
  request: { params: item },
  responses: { 200: jsonResponse("Saved view", savedViewSchema), ...errors },
});
const create = createRoute({
  ...shared,
  middleware: [...readViews, requirePersonalViewWrite],
  method: "post",
  path: "/{workspaceId}",
  operationId: "createSavedView",
  summary: "Save personal or workspace issue filters and display options",
  request: { params, body: body(savedViewBody) },
  responses: { 200: jsonResponse("Created view", savedViewSchema), ...errors },
});
const update = createRoute({
  ...shared,
  middleware: [...readViews, requirePersonalViewWrite],
  method: "put",
  path: "/{workspaceId}/{id}",
  operationId: "updateSavedView",
  summary: "Replace a saved view's settings",
  request: { params: item, body: body(savedViewBody) },
  responses: { 200: jsonResponse("Updated view", savedViewSchema), ...errors },
});
const remove = createRoute({
  ...shared,
  middleware: [...readViews, requirePersonalViewWrite],
  method: "delete",
  path: "/{workspaceId}/{id}",
  operationId: "deleteSavedView",
  summary: "Delete a saved view without deleting its issues",
  request: { params: item },
  responses: { 200: jsonResponse("Deleted view", z.object({ id })), ...errors },
});
export default planningRouter()
  .openapi(list, async (c) => {
    const { page, pageSize } = c.req.valid("query");
    return c.json(
      await listSavedViews(
        actor(c),
        page,
        pageSize,
        await hasWorkspacePermission(c, { workspace: ["manage_settings"] }),
        await hasWorkspacePermission(c, { project: ["update"] }),
      ),
      200,
    );
  })
  .openapi(get, async (c) =>
    c.json(
      await getSavedView(
        c.req.valid("param").id,
        actor(c),
        await hasWorkspacePermission(c, { workspace: ["manage_settings"] }),
        await hasWorkspacePermission(c, { project: ["update"] }),
      ),
      200,
    ),
  )
  .openapi(create, async (c) =>
    c.json(
      await saveView(
        actor(c),
        c.req.valid("json"),
        await hasWorkspacePermission(c, { project: ["update"] }),
        await hasWorkspacePermission(c, { workspace: ["manage_settings"] }),
      ),
      200,
    ),
  )
  .openapi(update, async (c) =>
    c.json(
      await saveView(
        actor(c),
        c.req.valid("json"),
        await hasWorkspacePermission(c, { project: ["update"] }),
        await hasWorkspacePermission(c, { workspace: ["manage_settings"] }),
        c.req.valid("param").id,
      ),
      200,
    ),
  )
  .openapi(remove, async (c) =>
    c.json(
      await deleteSavedView(
        c.req.valid("param").id,
        actor(c),
        await hasWorkspacePermission(c, { project: ["update"] }),
        await hasWorkspacePermission(c, { workspace: ["manage_settings"] }),
      ),
      200,
    ),
  );

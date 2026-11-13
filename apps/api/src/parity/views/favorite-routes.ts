import { createRoute, jsonResponse, z } from "../../openapi";
import { actor } from "../planning/access";
import { id } from "../planning/schema";
import { body, errors, planningRouter } from "../planning/routes/shared";
import { listFavorites } from "./favorite-read";
import {
  addFavorite,
  removeFavorite,
  reorderFavorites,
} from "./favorite-write";
import { favoriteSchema, favoriteTarget } from "./schema";
import { readViews } from "./task-routes";
import { requirePersonalViewWrite } from "./personal-write";
const params = z.object({ workspaceId: id });
const common = { tags: ["Views"], middleware: [...readViews] };
const response = z.object({ items: z.array(favoriteSchema) });
const list = createRoute({
  ...common,
  method: "get",
  path: "/{workspaceId}",
  operationId: "listFavorites",
  summary: "List the current user's readable favorites in this workspace",
  request: { params },
  responses: { 200: jsonResponse("Favorites", response), ...errors },
});
const add = createRoute({
  ...common,
  middleware: [...readViews, requirePersonalViewWrite],
  method: "post",
  path: "/{workspaceId}",
  operationId: "addFavorite",
  summary: "Favorite a readable planning resource",
  request: { params, body: body(favoriteTarget) },
  responses: { 200: jsonResponse("Favorite", favoriteTarget), ...errors },
});
const remove = createRoute({
  ...common,
  middleware: [...readViews, requirePersonalViewWrite],
  method: "delete",
  path: "/{workspaceId}/{kind}/{targetId}",
  operationId: "removeFavorite",
  summary: "Remove a favorite",
  request: { params: params.extend(favoriteTarget.shape) },
  responses: {
    200: jsonResponse("Removed favorite", favoriteTarget),
    ...errors,
  },
});
const order = createRoute({
  ...common,
  middleware: [...readViews, requirePersonalViewWrite],
  method: "put",
  path: "/{workspaceId}/order",
  operationId: "reorderFavorites",
  summary: "Reorder the current workspace's visible favorites",
  request: {
    params,
    body: body(z.strictObject({ items: z.array(favoriteTarget).max(1000) })),
  },
  responses: { 200: jsonResponse("Favorites", response), ...errors },
});
export default planningRouter()
  .openapi(list, async (c) =>
    c.json({ items: await listFavorites(actor(c)) }, 200),
  )
  .openapi(add, async (c) =>
    c.json(await addFavorite(actor(c), c.req.valid("json")), 200),
  )
  .openapi(remove, async (c) => {
    const { kind, targetId } = c.req.valid("param");
    return c.json(await removeFavorite(actor(c), { kind, targetId }), 200);
  })
  .openapi(order, async (c) =>
    c.json(await reorderFavorites(actor(c), c.req.valid("json").items), 200),
  );

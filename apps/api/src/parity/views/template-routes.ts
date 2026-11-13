import { createRoute, jsonResponse, z } from "../../openapi";
import { requireWorkspacePermission } from "../../utils/require-workspace-permission";
import { workspaceAccess } from "../../utils/workspace-access-middleware";
import { requireParity } from "../foundation/features";
import { actor } from "../planning/access";
import { id, pageQuery } from "../planning/schema";
import { body, errors, planningRouter } from "../planning/routes/shared";
import { templateBody, templateSchema } from "./schema";
import { getTaskTemplate, listTaskTemplates } from "./template-read";
import { deleteTaskTemplate, saveTaskTemplate } from "./template-write";
const params = z.object({ projectId: id });
const item = params.extend({ name: z.string().min(1).max(200) });
const read = [
  requireParity("views"),
  workspaceAccess.fromProject("projectId"),
  requireWorkspacePermission({ project: ["read"] }),
] as const;
const write = [
  ...read,
  requireWorkspacePermission({ project: ["update"] }),
] as const;
const list = createRoute({
  method: "get",
  path: "/{projectId}",
  operationId: "listTaskTemplates",
  tags: ["Views"],
  summary: "List project issue templates",
  middleware: [...read],
  request: { params, query: pageQuery.strict() },
  responses: {
    200: jsonResponse(
      "Templates",
      z.object({
        items: z.array(templateSchema),
        page: z.number(),
        pageSize: z.number(),
        hasMore: z.boolean(),
      }),
    ),
    ...errors,
  },
});
const get = createRoute({
  method: "get",
  path: "/{projectId}/{name}",
  operationId: "getTaskTemplate",
  tags: ["Views"],
  summary: "Read an issue template",
  middleware: [...read],
  request: { params: item },
  responses: { 200: jsonResponse("Template", templateSchema), ...errors },
});
const create = createRoute({
  method: "post",
  path: "/{projectId}",
  operationId: "createTaskTemplate",
  tags: ["Views"],
  summary: "Create a project issue template",
  middleware: [...write],
  request: { params, body: body(templateBody) },
  responses: { 200: jsonResponse("Template", templateSchema), ...errors },
});
const update = createRoute({
  method: "put",
  path: "/{projectId}/{name}",
  operationId: "updateTaskTemplate",
  tags: ["Views"],
  summary: "Edit or rename a project issue template",
  middleware: [...write],
  request: { params: item, body: body(templateBody) },
  responses: { 200: jsonResponse("Template", templateSchema), ...errors },
});
const remove = createRoute({
  method: "delete",
  path: "/{projectId}/{name}",
  operationId: "deleteTaskTemplate",
  tags: ["Views"],
  summary: "Delete a project issue template",
  middleware: [...write],
  request: { params: item },
  responses: { 200: jsonResponse("Deleted template", item), ...errors },
});
export default planningRouter()
  .openapi(list, async (c) => {
    const { page, pageSize } = c.req.valid("query");
    return c.json(
      await listTaskTemplates(
        c.req.valid("param").projectId,
        actor(c),
        page,
        pageSize,
      ),
      200,
    );
  })
  .openapi(get, async (c) => {
    const { projectId, name } = c.req.valid("param");
    return c.json(await getTaskTemplate(projectId, name, actor(c)), 200);
  })
  .openapi(create, async (c) =>
    c.json(
      await saveTaskTemplate(
        c.req.valid("param").projectId,
        actor(c),
        c.req.valid("json"),
      ),
      200,
    ),
  )
  .openapi(update, async (c) => {
    const { projectId, name } = c.req.valid("param");
    return c.json(
      await saveTaskTemplate(projectId, actor(c), c.req.valid("json"), name),
      200,
    );
  })
  .openapi(remove, async (c) => {
    const { projectId, name } = c.req.valid("param");
    return c.json(await deleteTaskTemplate(projectId, name, actor(c)), 200);
  });

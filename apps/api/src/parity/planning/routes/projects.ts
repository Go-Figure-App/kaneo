import { createRoute, jsonResponse, z } from "../../../openapi";
import { actor } from "../access";
import { getProjectPlan, listProjectPlans } from "../project-read";
import { updateProjectPlan } from "../project-write";
import {
  id,
  pageQuery,
  planBody,
  projectPlanSchema,
  projectSummarySchema,
} from "../schema";
import {
  body,
  errors,
  planningRouter,
  readProject,
  readWorkspace,
  writeProject,
} from "./shared";

const params = z.object({ projectId: id });
const list = createRoute({
  method: "get",
  path: "/workspace/{workspaceId}",
  operationId: "listProjectPlans",
  tags: ["Project planning"],
  summary: "List readable projects with planning properties and progress",
  middleware: [...readWorkspace],
  request: { params: z.object({ workspaceId: id }), query: pageQuery },
  responses: {
    200: jsonResponse(
      "Project plans",
      z.object({
        items: z.array(projectSummarySchema),
        hasMore: z.boolean(),
        page: z.number(),
        pageSize: z.number(),
      }),
    ),
    ...errors,
  },
});
const get = createRoute({
  method: "get",
  path: "/{projectId}",
  operationId: "getProjectPlan",
  tags: ["Project planning"],
  summary: "Get a project plan, milestones, progress and latest update",
  middleware: [...readProject],
  request: { params },
  responses: {
    200: jsonResponse("Project plan", projectPlanSchema),
    ...errors,
  },
});
const put = createRoute({
  method: "put",
  path: "/{projectId}",
  operationId: "updateProjectPlan",
  tags: ["Project planning"],
  summary: "Update project status, lead, dates and priority",
  middleware: [...writeProject],
  request: { params, body: body(planBody) },
  responses: {
    200: jsonResponse("Updated project plan", projectPlanSchema),
    ...errors,
  },
});

export default planningRouter()
  .openapi(list, async (c) => {
    const { page, pageSize } = c.req.valid("query");
    return c.json(await listProjectPlans(actor(c), page, pageSize), 200);
  })
  .openapi(get, async (c) =>
    c.json(await getProjectPlan(c.req.valid("param").projectId, actor(c)), 200),
  )
  .openapi(put, async (c) =>
    c.json(
      await updateProjectPlan(
        c.req.valid("param").projectId,
        actor(c),
        c.req.valid("json"),
      ),
      200,
    ),
  );

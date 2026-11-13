import { apiRouter, createRoute, jsonResponse, z } from "../../openapi";
import { requireWorkspacePermission } from "../../utils/require-workspace-permission";
import { workspaceAccess } from "../../utils/workspace-access-middleware";
import { requireParity } from "../foundation/features";
import { actor } from "../planning/access";
import { errors } from "../planning/routes/shared";
import { id } from "../planning/schema";
import { getInsights } from "./read";
import { insightsQuery, insightsSchema } from "./schema";

const get = createRoute({
  method: "get",
  path: "/{workspaceId}",
  operationId: "getInsights",
  tags: ["Insights"],
  summary: "Get delivery reports for readable projects",
  description:
    "Task measures support week, cycle, assignee, project, label and priority slices. Cycle history measures support the cycle slice and project/initiative filters; burndown requires cycleId and returns daily rows. Time in state returns category rows and does not accept slice. Dates are inclusive workspace-local calendar days, with a two-year maximum. Workload is current open work; explicit date filters select its creation cohort. Duration rows omit missing timestamps. Cycle history never infers individual assignment history or exposes unfilterable imported aggregates. Cached responses last up to 60 seconds and recheck current project access.",
  middleware: [
    requireParity("insights"),
    workspaceAccess.fromParam(),
    requireWorkspacePermission({
      workspace: ["read"],
      project: ["read"],
      task: ["read"],
    }),
  ],
  request: {
    params: z.strictObject({ workspaceId: id }),
    query: insightsQuery,
  },
  responses: {
    200: jsonResponse("Permission-filtered insight rows", insightsSchema),
    ...errors,
  },
});
export default apiRouter().openapi(get, async (c) =>
  c.json(await getInsights(actor(c), c.req.valid("query")), 200),
);

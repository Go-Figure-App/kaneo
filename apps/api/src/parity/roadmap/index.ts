import { apiRouter, createRoute, jsonResponse, z } from "../../openapi";
import { requireParity } from "../foundation/features";
import { actor } from "../planning/access";
import { errors, readWorkspace } from "../planning/routes/shared";
import { id } from "../planning/schema";
import { getRoadmap } from "./read";
import { roadmapSchema } from "./schema";

const get = createRoute({
  method: "get",
  path: "/{workspaceId}",
  operationId: "getRoadmap",
  tags: ["Roadmap"],
  summary:
    "Get readable project plans, initiative groups and milestones for a workspace timeline",
  middleware: [requireParity("roadmap"), ...readWorkspace],
  request: { params: z.object({ workspaceId: id }) },
  responses: {
    200: jsonResponse("Workspace roadmap", roadmapSchema),
    ...errors,
  },
});
export default apiRouter().openapi(get, async (c) =>
  c.json(await getRoadmap(actor(c)), 200),
);

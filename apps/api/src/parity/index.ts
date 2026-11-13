import {
  apiRouter,
  createRoute,
  errorResponse,
  jsonResponse,
  z,
} from "../openapi";
import { requireWorkspacePermission } from "../utils/require-workspace-permission";
import { workspaceAccess } from "../utils/workspace-access-middleware";
import { categories } from "./foundation/categories";
import {
  getCategories,
  updateCategory,
} from "./foundation/controllers/columns";
import {
  enabledFeatures,
  parityFeatures,
  requireParity,
} from "./foundation/features";
import triage from "./triage";

const categorySchema = z.enum(categories);
const columnSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  name: z.string(),
  slug: z.string(),
  isFinal: z.boolean(),
  category: categorySchema,
});

const featuresRoute = createRoute({
  method: "get",
  path: "/features",
  operationId: "getParityFeatures",
  tags: ["Parity"],
  summary: "Get enabled planning features",
  responses: {
    200: jsonResponse(
      "Enabled features for this instance",
      z.object({ features: z.array(z.enum(parityFeatures)) }),
    ),
  },
});
const columnsRoute = createRoute({
  method: "get",
  path: "/columns/{projectId}",
  operationId: "getParityColumns",
  tags: ["Parity"],
  summary: "Get workflow state categories",
  middleware: [
    requireParity("foundation"),
    workspaceAccess.fromProject("projectId"),
    requireWorkspacePermission({ project: ["read"] }),
  ] as const,
  request: { params: z.object({ projectId: z.string().min(1) }) },
  responses: {
    200: jsonResponse(
      "Columns with inferred or configured categories",
      z.array(columnSchema),
    ),
    403: errorResponse("Project access denied"),
    404: errorResponse("Project not found or feature disabled"),
  },
});
const updateRoute = createRoute({
  method: "put",
  path: "/columns/{projectId}/{columnId}",
  operationId: "updateParityColumn",
  tags: ["Parity"],
  summary: "Set a workflow state category",
  middleware: [
    requireParity("foundation"),
    workspaceAccess.fromProject("projectId"),
    requireWorkspacePermission({ project: ["update"] }),
  ] as const,
  request: {
    params: z.object({
      projectId: z.string().min(1),
      columnId: z.string().min(1),
    }),
    body: {
      required: true,
      content: {
        "application/json": { schema: z.object({ category: categorySchema }) },
      },
    },
  },
  responses: {
    200: jsonResponse(
      "Updated category",
      z.object({ columnId: z.string(), category: categorySchema }),
    ),
    400: errorResponse("Invalid category"),
    403: errorResponse("Project update denied"),
    404: errorResponse("Project or column not found, or feature disabled"),
  },
});

export default apiRouter()
  .route("/triage", triage)
  .openapi(featuresRoute, (c) => c.json({ features: enabledFeatures() }, 200))
  .openapi(columnsRoute, async (c) =>
    c.json(await getCategories(c.req.valid("param").projectId), 200),
  )
  .openapi(updateRoute, async (c) => {
    const { projectId, columnId } = c.req.valid("param");
    return c.json(
      await updateCategory(projectId, columnId, c.req.valid("json").category),
      200,
    );
  });

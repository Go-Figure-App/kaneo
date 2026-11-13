import {
  apiRouter,
  errorResponse,
  z,
  type BaseVariables,
} from "../../../openapi";
import { requireWorkspacePermission } from "../../../utils/require-workspace-permission";
import { workspaceAccess } from "../../../utils/workspace-access-middleware";
import { requireParity } from "../../foundation/features";

export const planningRouter = () =>
  apiRouter<BaseVariables & { workspaceId: string }>();
export const errors = {
  400: errorResponse("Invalid planning input"),
  401: errorResponse("Authentication required"),
  403: errorResponse("Insufficient permission or project access"),
  404: errorResponse("Resource unavailable or feature disabled"),
  409: errorResponse("Planning resource changed; refresh and try again"),
};
export const body = <T extends z.ZodType>(schema: T) => ({
  required: true,
  content: { "application/json": { schema } },
});
export const readProject = [
  requireParity("projects"),
  workspaceAccess.fromProject("projectId"),
  requireWorkspacePermission({ project: ["read"], task: ["read"] }),
] as const;
export const writeProject = [
  ...readProject,
  requireWorkspacePermission({ project: ["update"] }),
] as const;
export const readWorkspace = [
  requireParity("projects"),
  workspaceAccess.fromParam(),
  requireWorkspacePermission({
    workspace: ["read"],
    project: ["read"],
    task: ["read"],
  }),
] as const;

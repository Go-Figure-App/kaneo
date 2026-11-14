import { client } from "@tracing/libs";
import type { InferRequestType } from "hono/client";
import { HttpError } from "@/lib/http-error";
const views = client.parity.views[":workspaceId"];
const tasks = client.parity.tasks[":workspaceId"];
const favorites = client.parity.favorites[":workspaceId"];
const templates = client.parity.templates[":projectId"];
export type SavedViewInput = InferRequestType<typeof views.$post>["json"];
export type ViewFilters = NonNullable<SavedViewInput["filters"]>;
export type TaskFilter = ViewFilters[number];
export type ViewDisplay = Awaited<ReturnType<typeof getSavedView>>["display"];
export type WorkspaceTaskQuery = InferRequestType<typeof tasks.$get>["query"];
export type FavoriteTarget = InferRequestType<typeof favorites.$post>["json"];
export type TemplateInput = InferRequestType<typeof templates.$post>["json"];
export async function getWorkspaceTasks(
  workspaceId: string,
  query: WorkspaceTaskQuery = { page: undefined, pageSize: undefined },
) {
  const response = await tasks.$get({ param: { workspaceId }, query });
  if (!response.ok) throw await HttpError.fromResponse(response);
  return response.json();
}
export type WorkspaceTask = Awaited<
  ReturnType<typeof getWorkspaceTasks>
>["items"][number];
export async function getViewOptions(workspaceId: string, projectId?: string) {
  const response = await tasks.options.$get({
    param: { workspaceId },
    query: { projectId },
  });
  if (!response.ok) throw await HttpError.fromResponse(response);
  return response.json();
}
export type ViewOptions = Awaited<ReturnType<typeof getViewOptions>>;
export async function getSavedViews(workspaceId: string, page = 1) {
  const response = await views.$get({
    param: { workspaceId },
    query: { page: String(page), pageSize: "100" },
  });
  if (!response.ok) throw await HttpError.fromResponse(response);
  return response.json();
}
export type SavedView = Awaited<
  ReturnType<typeof getSavedViews>
>["items"][number];
export async function getSavedView(workspaceId: string, id: string) {
  const response = await views[":id"].$get({ param: { workspaceId, id } });
  if (!response.ok) throw await HttpError.fromResponse(response);
  return response.json();
}
export async function saveView(
  workspaceId: string,
  json: SavedViewInput,
  id?: string,
) {
  const response = id
    ? await views[":id"].$put({ param: { workspaceId, id }, json })
    : await views.$post({ param: { workspaceId }, json });
  if (!response.ok) throw await HttpError.fromResponse(response);
  return response.json();
}
export async function deleteView(workspaceId: string, id: string) {
  const response = await views[":id"].$delete({ param: { workspaceId, id } });
  if (!response.ok) throw await HttpError.fromResponse(response);
  return response.json();
}
export async function getFavorites(workspaceId: string) {
  const response = await favorites.$get({ param: { workspaceId } });
  if (!response.ok) throw await HttpError.fromResponse(response);
  return response.json();
}
export type Favorite = Awaited<
  ReturnType<typeof getFavorites>
>["items"][number];
export async function setFavorite(
  workspaceId: string,
  target: FavoriteTarget,
  added: boolean,
) {
  const response = added
    ? await favorites.$post({ param: { workspaceId }, json: target })
    : await favorites[":kind"][":targetId"].$delete({
        param: { workspaceId, ...target },
      });
  if (!response.ok) throw await HttpError.fromResponse(response);
  return response.json();
}
export async function reorderFavorites(
  workspaceId: string,
  items: FavoriteTarget[],
) {
  const response = await favorites.order.$put({
    param: { workspaceId },
    json: { items },
  });
  if (!response.ok) throw await HttpError.fromResponse(response);
  return response.json();
}
export async function getTemplates(projectId: string, page = 1) {
  const response = await templates.$get({
    param: { projectId },
    query: { page: String(page), pageSize: "100" },
  });
  if (!response.ok) throw await HttpError.fromResponse(response);
  return response.json();
}
export type TaskTemplate = Awaited<
  ReturnType<typeof getTemplates>
>["items"][number];
export async function saveTemplate(
  projectId: string,
  json: TemplateInput,
  name?: string,
) {
  const response = name
    ? await templates[":name"].$put({
        param: { projectId, name: encodeURIComponent(name) },
        json,
      })
    : await templates.$post({ param: { projectId }, json });
  if (!response.ok) throw await HttpError.fromResponse(response);
  return response.json();
}
export async function deleteTemplate(projectId: string, name: string) {
  const response = await templates[":name"].$delete({
    param: { projectId, name: encodeURIComponent(name) },
  });
  if (!response.ok) throw await HttpError.fromResponse(response);
  return response.json();
}

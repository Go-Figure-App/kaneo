import { request } from "@/lib/api/client";
import type { Page, SavedView, WorkspaceIssue } from "./types";
export const viewsApi = {
  list: (workspaceId: string, page = 1) =>
    request<Page<SavedView>>(
      `api/parity/views/${encodeURIComponent(workspaceId)}`,
      { query: { page, pageSize: 50 } },
    ),
  view: (workspaceId: string, id: string) =>
    request<SavedView>(
      `api/parity/views/${encodeURIComponent(workspaceId)}/${encodeURIComponent(id)}`,
    ),
  tasks: (workspaceId: string, page = 1, view?: SavedView) =>
    request<Page<WorkspaceIssue> & { timeZone: string }>(
      `api/parity/tasks/${encodeURIComponent(workspaceId)}`,
      {
        query: {
          page,
          pageSize: 50,
          ...(view
            ? {
                filters: JSON.stringify(view.filters),
                projectId: view.projectId ?? undefined,
                orderBy: view.display.orderBy,
                direction: view.display.direction,
                includeArchivedProjects: view.display.includeArchivedProjects
                  ? "true"
                  : undefined,
              }
            : {}),
        },
      },
    ),
};

import { request } from "@/lib/api/client";
import type { CreateTaskBody, Task } from "@/lib/api/types";

export type TriageItem = {
  id: string;
  projectId: string;
  title: string;
  number: number | null;
  description: string | null;
  status: string;
  priority: string;
  userId: string | null;
  assigneeName: string | null;
  projectName: string;
  projectSlug: string;
  createdAt: string;
  source: string | null;
  snoozedUntil: string | null;
};
export type TriageDecision =
  | {
      action: "accept";
      body: { columnId: string; assigneeId?: string | null; priority?: string };
    }
  | { action: "decline"; body: { comment: string } }
  | { action: "duplicate"; body: { duplicateOfTaskId: string } }
  | { action: "snooze"; body: { until: string } };
const path = "api/parity/triage";
export const triageApi = {
  features: () => request<{ features: string[] }>("api/parity/features"),
  list: (workspaceId: string, page = 1) =>
    request<{
      items: TriageItem[];
      total: number;
      page: number;
      pageSize: number;
    }>(`${path}/${encodeURIComponent(workspaceId)}`, {
      query: { page, pageSize: 50 },
    }),
  count: (workspaceId: string) =>
    request<{ count: number }>(
      `${path}/${encodeURIComponent(workspaceId)}/count`,
    ),
  projects: (workspaceId: string) =>
    request<Array<{ id: string; name: string; slug: string }>>(
      `${path}/${encodeURIComponent(workspaceId)}/projects`,
    ),
  columns: (projectId: string) =>
    request<Array<{ id: string; name: string; category: string }>>(
      `api/parity/columns/${encodeURIComponent(projectId)}`,
    ),
  create: (projectId: string, body: Omit<CreateTaskBody, "status">) =>
    request<Task>(`${path}/${encodeURIComponent(projectId)}`, {
      method: "POST",
      body,
    }),
  decide: (taskId: string, decision: TriageDecision) =>
    request<{ id: string }>(
      `${path}/item/${encodeURIComponent(taskId)}/${decision.action}`,
      { method: "POST", body: decision.body, keepNulls: true },
    ),
};

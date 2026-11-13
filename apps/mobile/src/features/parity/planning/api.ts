import { request } from "@/lib/api/client";
import type {
  Health,
  Initiative,
  InitiativeDetail,
  InitiativeInput,
  Milestone,
  Page,
  ParentType,
  PlanInput,
  ProjectPlan,
  StatusUpdate,
} from "./types";

const root = "api/parity";
const part = encodeURIComponent;
export const planningApi = {
  project: (id: string) =>
    request<ProjectPlan>(`${root}/project-plan/${part(id)}`),
  updateProject: (id: string, body: PlanInput) =>
    request<ProjectPlan>(`${root}/project-plan/${part(id)}`, {
      method: "PUT",
      body,
      keepNulls: true,
    }),
  milestones: (projectId: string) =>
    request<Milestone[]>(`${root}/milestone/${part(projectId)}`),
  taskMilestone: (id: string) =>
    request<{
      taskId: string;
      milestoneId: string | null;
      name: string | null;
    }>(`${root}/task/${part(id)}/milestone`),
  setMilestone: (id: string, milestoneId: string | null) =>
    request<{ taskId: string; milestoneId: string | null }>(
      `${root}/task/${part(id)}/milestone`,
      { method: "PUT", body: { milestoneId }, keepNulls: true },
    ),
  initiatives: (workspaceId: string, page = 1, includeArchived = false) =>
    request<Page<Initiative>>(`${root}/initiative/${part(workspaceId)}`, {
      query: {
        page,
        pageSize: 50,
        includeArchived: includeArchived ? "true" : "false",
      },
    }),
  initiative: (id: string) =>
    request<InitiativeDetail>(`${root}/initiative/item/${part(id)}`),
  createInitiative: (workspaceId: string, body: InitiativeInput) =>
    request<Initiative>(`${root}/initiative/${part(workspaceId)}`, {
      method: "POST",
      body,
      keepNulls: true,
    }),
  updateInitiative: (
    id: string,
    body: Partial<InitiativeInput> & { archived?: boolean },
  ) =>
    request<Initiative>(`${root}/initiative/item/${part(id)}`, {
      method: "PUT",
      body,
      keepNulls: true,
    }),
  updates: (kind: ParentType, id: string, page = 1) =>
    request<Page<StatusUpdate>>(`${root}/status-update/${kind}/${part(id)}`, {
      query: { page, pageSize: 20 },
    }),
  postUpdate: (
    kind: ParentType,
    id: string,
    body: { health: Health; body: string },
  ) =>
    request<StatusUpdate>(`${root}/status-update/${kind}/${part(id)}`, {
      method: "POST",
      body,
    }),
};

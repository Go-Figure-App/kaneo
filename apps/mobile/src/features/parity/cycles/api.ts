import { request } from "@/lib/api/client";
import type { Page } from "../planning/types";
import type {
  Cycle,
  CycleDetail,
  CyclePhase,
  CycleSettings,
  CycleTask,
  CycleTaskFilters,
  TaskCycleProperties,
} from "./types";
const root = "api/parity";
const part = encodeURIComponent;
export const cyclesApi = {
  list: (workspaceId: string, phase: CyclePhase | "all" = "all", page = 1) =>
    request<Page<Cycle> & { settings: CycleSettings }>(
      `${root}/cycle/${part(workspaceId)}`,
      { query: { phase, page, pageSize: 50 } },
    ),
  detail: (id: string) =>
    request<CycleDetail>(`${root}/cycle/item/${part(id)}`),
  tasks: (id: string, page = 1, filters: CycleTaskFilters = {}) =>
    request<Page<CycleTask>>(`${root}/cycle/item/${part(id)}/tasks`, {
      query: { ...filters, page, pageSize: 100 },
    }),
  task: (id: string) =>
    request<TaskCycleProperties>(`${root}/task/${part(id)}/cycle-properties`),
  setEstimate: (id: string, estimate: number | null) =>
    request<TaskCycleProperties>(`${root}/task/${part(id)}/estimate`, {
      method: "PUT",
      body: { estimate },
      keepNulls: true,
    }),
  setCycle: (id: string, cycleId: string | null) =>
    request<TaskCycleProperties>(`${root}/task/${part(id)}/cycle`, {
      method: "PUT",
      body: { cycleId },
      keepNulls: true,
    }),
};

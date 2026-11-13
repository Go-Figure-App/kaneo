export type EstimateScale = "none" | "linear" | "fibonacci" | "t-shirt";
export type CycleReference = {
  id: string;
  number: number;
  name: string | null;
  startsAt: string;
  endsAt: string;
  completedAt: string | null;
};
export type TaskCycleProperties = {
  taskId: string;
  cycle: CycleReference | null;
  estimate: number | null;
  estimateScale: EstimateScale;
  cyclesEnabled: boolean;
};
export type CyclePhase = "current" | "upcoming" | "past";
export type CycleTotals = {
  scopeCount: number;
  scopePoints: number;
  startedCount: number;
  startedPoints: number;
  completedCount: number;
  completedPoints: number;
};
export type CycleSettings = {
  workspaceId: string;
  cyclesEnabled: boolean;
  estimateScale: EstimateScale;
  cycleWeeks: number;
  cooldownWeeks: number;
  cycleStartDay: number;
  upcomingCycles: number;
  autoRollover: boolean;
  timeZone: string;
};
export type Cycle = CycleReference & {
  workspaceId: string;
  phase: CyclePhase;
  progress: CycleTotals;
  summary:
    | (CycleTotals & { rolledOverCount: number; rolledOverPoints: number })
    | null;
  createdAt: string;
  updatedAt: string;
};
export type CycleDetail = Cycle & {
  days: (CycleTotals & { day: string })[];
  historyAvailable: boolean;
  settings: CycleSettings;
};
export type CycleTask = {
  id: string;
  projectId: string;
  projectName: string;
  projectSlug: string;
  title: string;
  number: number | null;
  status: string;
  statusName: string;
  category: "backlog" | "unstarted" | "started" | "completed" | "canceled";
  priority: string;
  userId: string | null;
  assigneeName: string | null;
  estimate: number | null;
  dueDate: string | null;
  labels: { name: string; color: string }[];
};
export type CycleTaskFilters = {
  projectId?: string;
  assigneeId?: string;
  category?: CycleTask["category"];
  status?: string;
  priority?: "no-priority" | "low" | "medium" | "high" | "urgent";
  label?: string;
  search?: string;
};

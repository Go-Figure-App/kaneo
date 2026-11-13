export type Health = "on_track" | "at_risk" | "off_track";
export type ProjectStatus =
  | "backlog"
  | "planned"
  | "started"
  | "paused"
  | "completed"
  | "canceled";
export type InitiativeStatus = "planned" | "active" | "completed";
export type Priority = "no-priority" | "low" | "medium" | "high" | "urgent";
export type ParentType = "project" | "initiative";
export type Page<T> = {
  items: T[];
  hasMore: boolean;
  page: number;
  pageSize: number;
};
export type Progress = {
  completed: number;
  total: number;
  percent: number;
  completedPoints: number | null;
  totalPoints: number | null;
  pointsPercent: number | null;
};
export type StatusUpdate = {
  id: string;
  parentType: ParentType;
  parentId: string;
  authorId: string | null;
  authorName: string | null;
  health: Health;
  body: string;
  createdAt: string;
};
export type Milestone = {
  id: string;
  projectId: string;
  name: string;
  description: string;
  targetDate: string | null;
  position: number;
  progress: Progress;
};
export type ProjectSummary = {
  id: string;
  workspaceId: string;
  name: string;
  slug: string;
  icon: string | null;
  description: string | null;
  status: ProjectStatus;
  health: Health;
  leadId: string | null;
  leadName: string | null;
  startDate: string | null;
  targetDate: string | null;
  priority: Priority;
  progress: Progress;
  latestUpdate: StatusUpdate | null;
};
export type ProjectPlan = ProjectSummary & { milestones: Milestone[] };
export type PlanInput = Partial<
  Pick<
    ProjectPlan,
    "status" | "leadId" | "startDate" | "targetDate" | "priority"
  >
>;
export type Initiative = {
  id: string;
  workspaceId: string;
  name: string;
  description: string;
  status: InitiativeStatus;
  health: Health;
  ownerId: string | null;
  ownerName: string | null;
  targetDate: string | null;
  icon: string | null;
  color: string | null;
  position: number;
  archivedAt: string | null;
  progress: Progress;
  projectCount: number;
  latestUpdate: StatusUpdate | null;
};
export type InitiativeDetail = Initiative & { projects: ProjectSummary[] };
export type InitiativeInput = Pick<
  Initiative,
  "name" | "status" | "ownerId" | "targetDate"
>;

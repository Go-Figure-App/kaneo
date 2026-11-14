export type SavedView = {
  id: string;
  workspaceId: string;
  projectId: string | null;
  ownerId: string;
  name: string;
  icon: string | null;
  shared: boolean;
  canEdit: boolean;
  // Native displays these filters unchanged; editing lives on web.
  filters: Record<string, unknown>[];
  display: {
    includeArchivedProjects?: boolean;
    layout: "list" | "board";
    groupBy: "state" | "assignee" | "project" | "priority" | "cycle" | "label";
    orderBy: "priority" | "created" | "updated" | "due";
    direction: "asc" | "desc";
    properties: string[];
  };
};
export type WorkspaceIssue = {
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
  creatorId: string | null;
  cycleId: string | null;
  cycleName: string | null;
  milestoneId: string | null;
  milestoneName: string | null;
  estimate: number | null;
  labels: { name: string; color: string }[];
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
};
export type Page<T> = {
  items: T[];
  page: number;
  pageSize: number;
  hasMore: boolean;
};

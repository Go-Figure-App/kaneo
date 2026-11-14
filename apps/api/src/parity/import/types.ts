export type Connection<T> = {
  nodes: T[];
  pageInfo: { hasNextPage: boolean; endCursor: string | null };
};
export type Reference = { id: string };
export type Person = { name: string | null; email: string | null };
export type Dated = {
  id: string;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
};
export type State = {
  id: string;
  name: string;
  type: string;
  position: number;
  team: Reference;
};
export type Team = Reference & {
  name: string;
  key: string;
  description: string | null;
  timezone: string;
  issueEstimationType: string;
};
export type Project = Dated & {
  name: string;
  description: string;
  content: string | null;
  status: { type: string };
  health: string | null;
  priority: number;
  lead: Person | null;
  startDate: string | null;
  targetDate: string | null;
  teams: Connection<Reference>;
};
export type Milestone = Dated & {
  name: string;
  description: string | null;
  targetDate: string | null;
  sortOrder: number;
  project: Reference;
};
export type Update = Dated & {
  body: string;
  health: string;
  user: Person | null;
  project?: Reference;
  initiative?: Reference;
};
export type Initiative = Dated & {
  name: string;
  description: string | null;
  content: string | null;
  status: string;
  health: string | null;
  owner: Person | null;
  targetDate: string | null;
  icon: string | null;
  color: string | null;
};
export type InitiativeProject = {
  id: string;
  initiative: Reference;
  project: Reference;
  sortOrder: string;
};
export type Cycle = Dated & {
  number: number;
  name: string | null;
  startsAt: string;
  endsAt: string;
  completedAt: string | null;
  team: Reference;
};
export type Label = Reference & {
  name: string;
  color: string | null;
  parent: { name: string } | null;
};
export type Comment = Dated & {
  body: string;
  user: Person | null;
  botActor: { name: string | null } | null;
};
export type StateSpan = Reference & {
  stateId: string;
  state: State | null;
  startedAt: string;
  endedAt: string | null;
};
export type Issue = Dated & {
  identifier: string;
  number: number;
  title: string;
  description: string | null;
  url: string;
  priority: number;
  sortOrder: number;
  estimate: number | null;
  dueDate: string | null;
  startedAt: string | null;
  completedAt: string | null;
  canceledAt: string | null;
  triagedAt: string | null;
  snoozedUntilAt: string | null;
  creator: Person | null;
  assignee: Person | null;
  team: Reference;
  state: State;
  cycle: Reference | null;
  projectMilestone: Reference | null;
  parent: Reference | null;
  labels: Connection<Label>;
  comments?: Connection<Comment>;
  stateHistory: Connection<StateSpan>;
};
export type Relation = Reference & {
  type: string;
  issue: Reference;
  relatedIssue: Reference;
};
export type WorkspacePlanning = {
  teams: Team[];
  states: State[];
  cycles: Cycle[];
  initiatives: Initiative[];
  initiativeProjects: InitiativeProject[];
  initiativeUpdates: Update[];
  relations: Relation[];
  warnings: string[];
};
export type ProjectPlanning = {
  sourceId: string;
  project: Project | null;
  teamIds: string[];
  issues: Issue[];
  milestones: Milestone[];
  updates: Update[];
  workspace: WorkspacePlanning;
};

export type ImportIdentity = (person: Person | null) => string | null;

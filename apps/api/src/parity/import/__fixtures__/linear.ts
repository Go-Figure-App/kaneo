import type {
  Connection,
  Cycle,
  Initiative,
  InitiativeProject,
  Issue,
  Milestone,
  Project,
  Relation,
  State,
  Team,
  Update,
} from "../types";

export const page = <T>(nodes: T[]): Connection<T> => ({
  nodes,
  pageInfo: { hasNextPage: false, endCursor: null },
});
const dated = {
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-10T00:00:00.000Z",
  archivedAt: null,
};
export function linearFixture(email = "importer@example.com") {
  const person = { name: "Importer", email };
  const teams: Team[] = [
    {
      id: "team-a",
      name: "Engineering",
      key: "ENG",
      description: "Team work",
      timezone: "America/Los_Angeles",
      issueEstimationType: "fibonacci",
    },
  ];
  const states: State[] = [
    "unstarted",
    "started",
    "completed",
    "triage",
    "duplicate",
  ].map((type, position) => ({
    id: `state-${type}`,
    name: type === "completed" ? "Shipped" : type,
    type,
    position,
    team: { id: "team-a" },
  }));
  const projects: Project[] = ["project-a", "project-b"].map((id, index) => ({
    ...dated,
    id,
    name: index ? "Platform" : "Launch",
    description: "Project summary",
    content: "Project **plan**",
    status: { type: "started" },
    health: "atRisk",
    priority: 2,
    lead: person,
    startDate: "2024-01-01",
    targetDate: "2024-02-01",
    teams: page([{ id: "team-a" }]),
  }));
  const cycles: Cycle[] = [
    {
      ...dated,
      id: "cycle-a",
      number: 1,
      name: "Launch sprint",
      startsAt: "2024-01-01T08:00:00.000Z",
      endsAt: "2024-01-15T08:00:00.000Z",
      completedAt: "2024-01-15T08:00:00.000Z",
      team: { id: "team-a" },
    },
  ];
  const initiatives: Initiative[] = ["initiative-a", "initiative-empty"].map(
    (id) => ({
      ...dated,
      id,
      name: id === "initiative-a" ? "Delivery" : "Future",
      description: "Initiative summary",
      content: "Initiative plan",
      status: "Active",
      health: "onTrack",
      owner: person,
      targetDate: "2024-03-01",
      icon: null,
      color: "#ff0000",
    }),
  );
  const initiativeProjects: InitiativeProject[] = projects.map(
    (project, i) => ({
      id: `link-${i}`,
      initiative: { id: "initiative-a" },
      project: { id: project.id },
      sortOrder: String(i),
    }),
  );
  const initiativeUpdates: Update[] = [
    {
      ...dated,
      id: "initiative-update",
      body: "On schedule",
      health: "onTrack",
      user: person,
      initiative: { id: "initiative-a" },
    },
  ];
  const milestones: Milestone[] = [
    {
      ...dated,
      id: "milestone-a",
      name: "Beta",
      description: "Ready for testing",
      targetDate: "2024-01-12",
      sortOrder: 1,
      project: { id: "project-a" },
    },
  ];
  const updates: Update[] = [
    {
      ...dated,
      id: "project-update",
      body: "Needs attention",
      health: "atRisk",
      user: person,
      project: { id: "project-a" },
    },
  ];
  const issue = (id: string, type: string, number: number): Issue => ({
    ...dated,
    id,
    identifier: `ENG-${number}`,
    number,
    title: `Issue ${number}`,
    description: "Original **description**",
    url: `https://linear.app/example/issue/ENG-${number}`,
    priority: 2,
    sortOrder: number,
    estimate: 3,
    dueDate: "2024-01-12",
    startedAt: type === "completed" ? "2024-01-02T00:00:00.000Z" : null,
    completedAt: type === "completed" ? "2024-01-05T00:00:00.000Z" : null,
    canceledAt: type === "duplicate" ? "2024-01-06T00:00:00.000Z" : null,
    triagedAt: type === "triage" ? null : "2024-01-01T00:00:00.000Z",
    snoozedUntilAt: null,
    creator: person,
    assignee: person,
    team: { id: "team-a" },
    state: states.find((state) => state.type === type)!,
    cycle: { id: "cycle-a" },
    projectMilestone: id === "issue-a" ? { id: "milestone-a" } : null,
    parent: null,
    labels: page([
      { id: "label-a", name: "Bug", color: "#ff0000", parent: null },
    ]),
    comments: page([
      {
        ...dated,
        id: `comment-${id}`,
        body: "Imported comment",
        user: person,
        botActor: null,
      },
    ]),
    stateHistory: page([]),
  });
  const issues = new Map<string, Issue[]>([
    ["project-a", [issue("issue-a", "completed", 42)]],
    ["project-b", [issue("issue-b", "duplicate", 43)]],
    ["team-a", [issue("issue-triage", "triage", 44)]],
  ]);
  issues.get("project-a")![0]!.stateHistory = page([
    {
      id: "span-1",
      stateId: "state-unstarted",
      state: states[0]!,
      startedAt: dated.createdAt,
      endedAt: "2024-01-02T00:00:00.000Z",
    },
    {
      id: "span-2",
      stateId: "state-started",
      state: states[1]!,
      startedAt: "2024-01-02T00:00:00.000Z",
      endedAt: "2024-01-05T00:00:00.000Z",
    },
    {
      id: "span-3",
      stateId: "state-completed",
      state: states[2]!,
      startedAt: "2024-01-05T00:00:00.000Z",
      endedAt: null,
    },
  ]);
  const relations: Relation[] = [
    {
      id: "duplicate-link",
      type: "duplicate",
      issue: { id: "issue-b" },
      relatedIssue: { id: "issue-a" },
    },
  ];
  return {
    teams,
    states,
    projects,
    cycles,
    initiatives,
    initiativeProjects,
    initiativeUpdates,
    milestones,
    updates,
    issues,
    relations,
  };
}
export type LinearFixture = ReturnType<typeof linearFixture>;

export function fixtureFetch(fixture: LinearFixture) {
  return async (_url: string, init?: RequestInit) => {
    const { query, variables = {} } = JSON.parse(String(init?.body)) as {
      query: string;
      variables?: Record<string, any>;
    };
    const operation = query.match(/query Planning(\w+)/)?.[1];
    let data: unknown;
    switch (operation) {
      case "Viewer":
        data = { viewer: { id: "viewer" } };
        break;
      case "teams":
        data = { teams: page(fixture.teams) };
        break;
      case "projects":
        data = { projects: page(fixture.projects) };
        break;
      case "workflowStates":
        data = { workflowStates: page(fixture.states) };
        break;
      case "cycles":
        data = { cycles: page(fixture.cycles) };
        break;
      case "initiatives":
        data = { initiatives: page(fixture.initiatives) };
        break;
      case "initiativeToProjects":
        data = { initiativeToProjects: page(fixture.initiativeProjects) };
        break;
      case "initiativeUpdates":
        data = { initiativeUpdates: page(fixture.initiativeUpdates) };
        break;
      case "issueRelations":
        data = { issueRelations: page(fixture.relations) };
        break;
      case "Issues": {
        const id =
          variables.filter.project?.id?.eq ?? variables.filter.team?.id?.eq;
        data = {
          issues: page(
            (fixture.issues.get(id) ?? []).map((issue) => ({
              ...issue,
              ...(variables.comments ? {} : { comments: undefined }),
            })),
          ),
        };
        break;
      }
      case "Milestones":
        data = {
          projectMilestones: page(
            fixture.milestones.filter((row) => row.project.id === variables.id),
          ),
        };
        break;
      case "ProjectUpdates":
        data = {
          projectUpdates: page(
            fixture.updates.filter((row) => row.project?.id === variables.id),
          ),
        };
        break;
      default:
        throw new Error(`Unexpected fixture query: ${operation}`);
    }
    return Response.json({ data });
  };
}

const pageInfo = "pageInfo { hasNextPage endCursor }";
const dates = "id createdAt updatedAt archivedAt";
const person = "name email";
const state = "id name type position team { id }";
const comment = `${dates} body user { ${person} } botActor { name }`;
const label = "id name color parent { name }";
const span = `id stateId startedAt endedAt state { ${state} }`;
const update = `${dates} body health user { ${person} }`;

export function rootQuery(root: string, fields: string) {
  return `query Planning${root}($after: String) {
    ${root}(first: 100, after: $after, includeArchived: true) {
      nodes { ${fields} } ${pageInfo}
    }
  }`;
}
export const teamsQuery = rootQuery(
  "teams",
  `id name key description timezone issueEstimationType`,
);
export const statesQuery = rootQuery("workflowStates", state);
export const projectsQuery = rootQuery(
  "projects",
  `${dates} name description content status { type } health priority
  lead { ${person} } startDate targetDate teams(first: 100, includeArchived: true) { nodes { id } ${pageInfo} }`,
);
export const cyclesQuery = rootQuery(
  "cycles",
  `${dates} number name startsAt endsAt completedAt team { id }`,
);
export const initiativesQuery = rootQuery(
  "initiatives",
  `${dates} name description content status health targetDate icon color owner { ${person} }`,
);
export const initiativeProjectsQuery = rootQuery(
  "initiativeToProjects",
  "id initiative { id } project { id } sortOrder",
);
export const initiativeUpdatesQuery = rootQuery(
  "initiativeUpdates",
  `${update} initiative { id }`,
);
export const relationsQuery = rootQuery(
  "issueRelations",
  "id type issue { id } relatedIssue { id }",
);
export const projectTeamsQuery = `query PlanningProjectTeams($id: String!, $after: String) {
  project(id: $id) { teams(first: 100, after: $after, includeArchived: true) { nodes { id } ${pageInfo} } }
}`;
export const milestonesQuery = `query PlanningMilestones($id: ID!, $after: String) {
  projectMilestones(first: 100, after: $after, includeArchived: true, filter: { project: { id: { eq: $id } } }) {
    nodes { ${dates} name description targetDate sortOrder project { id } } ${pageInfo}
  }
}`;
export const projectUpdatesQuery = `query PlanningProjectUpdates($id: ID!, $after: String) {
  projectUpdates(first: 100, after: $after, includeArchived: true, filter: { project: { id: { eq: $id } } }) {
    nodes { ${update} project { id } } ${pageInfo}
  }
}`;
export const issuesQuery = `query PlanningIssues($filter: IssueFilter!, $after: String, $comments: Boolean!) {
  issues(first: 25, after: $after, includeArchived: true, filter: $filter) {
    nodes {
      ${dates} identifier number title description url priority sortOrder estimate dueDate
      startedAt completedAt canceledAt triagedAt snoozedUntilAt
      creator { ${person} } assignee { ${person} } team { id } state { ${state} }
      cycle { id } projectMilestone { id } parent { id }
      labels(first: 20, includeArchived: true) { nodes { ${label} } ${pageInfo} }
      comments(first: 20, includeArchived: true) @include(if: $comments) { nodes { ${comment} } ${pageInfo} }
      stateHistory(first: 20) { nodes { ${span} } ${pageInfo} }
    } ${pageInfo}
  }
}`;
export const issueChildQueries = {
  labels: `query PlanningIssueLabels($id: String!, $after: String) { issue(id: $id) { labels(first: 100, after: $after, includeArchived: true) { nodes { ${label} } ${pageInfo} } } }`,
  comments: `query PlanningIssueComments($id: String!, $after: String) { issue(id: $id) { comments(first: 100, after: $after, includeArchived: true) { nodes { ${comment} } ${pageInfo} } } }`,
  stateHistory: `query PlanningIssueHistory($id: String!, $after: String) { issue(id: $id) { stateHistory(first: 100, after: $after) { nodes { ${span} } ${pageInfo} } } }`,
};

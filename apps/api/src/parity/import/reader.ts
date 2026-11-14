import {
  createLinearGraphQL,
  type LinearGraphQL,
  type LinearGraphQLOptions,
} from "@kaneo/importers/linear";
import { collectPages } from "./pagination";
import * as queries from "./queries";
import type {
  Connection,
  Cycle,
  Initiative,
  InitiativeProject,
  Issue,
  Milestone,
  Project,
  Reference,
  Relation,
  State,
  Team,
  Update,
  WorkspacePlanning,
} from "./types";

export class PlanningReader {
  private readonly graphql: LinearGraphQL;
  constructor(private readonly options: LinearGraphQLOptions) {
    this.graphql = createLinearGraphQL(options);
  }
  withSignal(signal?: AbortSignal) {
    return new PlanningReader({
      ...this.options,
      signal:
        signal && this.options.signal
          ? AbortSignal.any([signal, this.options.signal])
          : (signal ?? this.options.signal),
    });
  }
  async authenticate() {
    await this.graphql("query PlanningViewer { viewer { id } }");
  }
  collect<T>(
    query: string,
    root: string,
    variables: Record<string, unknown> = {},
  ) {
    return collectPages(async (after) => {
      const data = await this.graphql<Record<string, Connection<T>>>(query, {
        ...variables,
        after,
      });
      const connection = data[root];
      if (!connection)
        throw new Error("Linear returned an incomplete collection.");
      return connection;
    });
  }
  teams() {
    return this.collect<Team>(queries.teamsQuery, "teams");
  }
  async projects() {
    const projects = await this.collect<Project>(
      queries.projectsQuery,
      "projects",
    );
    for (const project of projects) {
      project.teams.nodes = await collectPages(async (after) => {
        const data = await this.graphql<{
          project: { teams: Connection<Reference> };
        }>(queries.projectTeamsQuery, { id: project.id, after });
        return data.project.teams;
      }, project.teams);
    }
    return projects;
  }
  async workspace(teams: Team[]): Promise<WorkspacePlanning> {
    // Collections are separate requests to stay within Linear's complexity budget.
    const states = await this.collect<State>(
      queries.statesQuery,
      "workflowStates",
    );
    const cycles = await this.collect<Cycle>(queries.cyclesQuery, "cycles");
    const initiatives = await this.collect<Initiative>(
      queries.initiativesQuery,
      "initiatives",
    );
    const initiativeProjects = await this.collect<InitiativeProject>(
      queries.initiativeProjectsQuery,
      "initiativeToProjects",
    );
    const initiativeUpdates = await this.collect<Update>(
      queries.initiativeUpdatesQuery,
      "initiativeUpdates",
    );
    const relations = await this.collect<Relation>(
      queries.relationsQuery,
      "issueRelations",
    );
    return {
      teams,
      states,
      cycles,
      initiatives,
      initiativeProjects,
      initiativeUpdates,
      relations,
      warnings: [],
    };
  }
  milestones(id: string) {
    return this.collect<Milestone>(
      queries.milestonesQuery,
      "projectMilestones",
      { id },
    );
  }
  updates(id: string) {
    return this.collect<Update>(queries.projectUpdatesQuery, "projectUpdates", {
      id,
    });
  }
  async issues(
    filter: Record<string, unknown>,
    comments: boolean,
    onProgress?: (message: string) => void,
  ) {
    const issues = await this.collect<Issue>(queries.issuesQuery, "issues", {
      filter,
      comments,
    });
    for (const [index, issue] of issues.entries()) {
      onProgress?.(`Reading issue details (${index + 1} of ${issues.length})`);
      await this.completeIssueChildren(issue, "labels");
      await this.completeIssueChildren(issue, "stateHistory");
      if (comments) await this.completeIssueChildren(issue, "comments");
    }
    return issues;
  }
  private async completeIssueChildren<
    K extends keyof typeof queries.issueChildQueries,
  >(issue: Issue, key: K) {
    const initial = issue[key];
    if (!initial) throw new Error("Linear omitted requested issue details.");
    const nodes = await collectPages<unknown>(async (after) => {
      const data = await this.graphql<{
        issue: Record<K, Connection<unknown>>;
      }>(queries.issueChildQueries[key], { id: issue.id, after });
      return data.issue[key];
    }, initial);
    // The query and destination are selected together by the same key.
    Object.assign(initial, {
      nodes,
      pageInfo: { hasNextPage: false, endCursor: null },
    });
  }
}

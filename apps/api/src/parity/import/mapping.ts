import type {
  ImportedPerson,
  ImportedPriority,
  ImportedProject,
} from "@kaneo/importers";
import type { Category } from "../foundation/categories";
import type { Person, ProjectPlanning, State } from "./types";

export function person(
  value: Person | null | undefined,
): ImportedPerson | undefined {
  if (!value) return undefined;
  return {
    ...(value.name ? { name: value.name } : {}),
    ...(value.email ? { email: value.email } : {}),
  };
}
export function priority(value: number): ImportedPriority {
  return (
    ({ 1: "urgent", 2: "high", 3: "medium", 4: "low" } as const)[
      value as 1 | 2 | 3 | 4
    ] ?? "no-priority"
  );
}
export function category(type: string): Category {
  if (type === "triage") return "backlog";
  if (type === "duplicate") return "canceled";
  if (
    ["backlog", "unstarted", "started", "completed", "canceled"].includes(type)
  )
    return type as Category;
  throw new Error(`Unsupported Linear workflow category: ${type}`);
}
export function projectStates(data: ProjectPlanning): State[] {
  const states = new Map<string, State>();
  for (const state of data.workspace.states) {
    if (data.teamIds.includes(state.team.id)) states.set(state.id, state);
  }
  for (const issue of data.issues) {
    states.set(issue.state.id, issue.state);
    for (const span of issue.stateHistory.nodes) {
      if (span.state) states.set(span.state.id, span.state);
    }
  }
  const ranks: Record<Category, number> = {
    backlog: 0,
    unstarted: 1,
    started: 2,
    completed: 3,
    canceled: 4,
  };
  return [...states.values()].sort(
    (a, b) =>
      ranks[category(a.type)] - ranks[category(b.type)] ||
      a.position - b.position ||
      a.id.localeCompare(b.id),
  );
}
export function mapProject(data: ProjectPlanning): ImportedProject {
  const team = data.workspace.teams.find((row) => row.id === data.teamIds[0]);
  const states = projectStates(data);
  const labels = new Map(
    data.issues.flatMap((issue) =>
      issue.labels.nodes.map((label) => [label.id, label] as const),
    ),
  );
  const source = data.project;
  const description = source
    ? [source.description, source.content].filter(Boolean).join("\n\n")
    : (team?.description ?? "");
  return {
    name: source?.name ?? `${team?.name ?? "Linear"} — No project`,
    ...(!source && team ? { key: team.key } : {}),
    description,
    columns: states.map((state) => ({
      key: state.id,
      name: state.name,
      isFinal: category(state.type) === "completed",
    })),
    labels: [...labels.values()].map((label) => ({
      key: label.id,
      name: label.parent ? `${label.parent.name}/${label.name}` : label.name,
      color: label.color ?? "gray",
    })),
    tasks: [...data.issues]
      .sort((a, b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id))
      .map((issue) => ({
        key: issue.id,
        number: issue.number,
        columnKey: issue.state.id,
        archived: Boolean(issue.archivedAt),
        title: issue.title,
        description: issue.description ?? "",
        priority: priority(issue.priority),
        createdAt: issue.createdAt,
        ...(issue.dueDate ? { dueDate: issue.dueDate } : {}),
        assignee: person(issue.assignee),
        labelKeys: issue.labels.nodes.map((label) => label.id),
        comments: (issue.comments?.nodes ?? []).map((comment) => ({
          author: person(comment.user) ?? {
            name: comment.botActor?.name ?? undefined,
          },
          body: comment.body,
          createdAt: comment.createdAt,
        })),
      })),
    // Cross-project links are written once all successful projects have committed.
    relations: [],
    warnings: [...data.workspace.warnings],
  };
}

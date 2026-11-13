import type {
  TaskFilter,
  ViewDisplay,
  WorkspaceTask,
} from "@/fetchers/parity/views";
export const defaultDisplay: ViewDisplay = {
  layout: "list",
  groupBy: "state",
  orderBy: "priority",
  direction: "asc",
  properties: ["identifier", "priority", "assignee", "project", "labels"],
};
export const filterFields = [
  "category",
  "priority",
  "assignee",
  "creator",
  "label",
  "project",
  "cycle",
  "milestone",
  "estimate",
  "due",
  "created",
  "completed",
] as const;
export function validFilters(filters: TaskFilter[]) {
  return (
    encodeURIComponent(JSON.stringify(filters)).length <= 6_000 &&
    filters.every((filter) => {
      if ("values" in filter) return filter.values.length > 0;
      if (
        ["before", "after"].includes(filter.operator) &&
        filter.value === null
      )
        return false;
      return (
        filter.field !== "estimate" ||
        filter.value === null ||
        (Number.isInteger(filter.value) &&
          filter.value >= 0 &&
          filter.value <= 1_000_000)
      );
    })
  );
}
export function groupWorkspaceTasks(
  tasks: WorkspaceTask[],
  groupBy: ViewDisplay["groupBy"],
  missing: string,
) {
  const groups = new Map<
    string,
    { id: string; name: string; tasks: WorkspaceTask[]; category?: string }
  >();
  const multipleProjects =
    new Set(tasks.map((task) => task.projectId)).size > 1;
  for (const task of tasks) {
    const choices: [string, string][] =
      groupBy === "label"
        ? task.labels.length
          ? task.labels.map((label) => [`label:${label.name}`, label.name])
          : [["none", missing]]
        : groupBy === "project"
          ? [[task.projectId, task.projectName]]
          : groupBy === "assignee"
            ? [[task.userId ?? "none", task.assigneeName ?? missing]]
            : groupBy === "priority"
              ? [[task.priority, task.priority]]
              : groupBy === "cycle"
                ? [[task.cycleId ?? "none", task.cycleName ?? missing]]
                : [
                    [
                      JSON.stringify([task.projectId, task.status]),
                      multipleProjects
                        ? `${task.projectName} · ${task.statusName}`
                        : task.statusName,
                    ],
                  ];
    for (const [id, name] of choices) {
      const group = groups.get(id) ?? {
        id,
        name,
        tasks: [],
        category: task.category,
      };
      group.tasks.push(task);
      groups.set(id, group);
    }
  }
  const result = [...groups.values()];
  if (groupBy === "state") {
    const order = ["backlog", "unstarted", "started", "completed", "canceled"];
    result.sort(
      (a, b) =>
        order.indexOf(a.category ?? "") - order.indexOf(b.category ?? "") ||
        a.name.localeCompare(b.name),
    );
  }
  if (groupBy === "priority") {
    const order = ["urgent", "high", "medium", "low", "no-priority"];
    result.sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
  }
  return result;
}

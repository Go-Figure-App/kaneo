import type { CycleTask } from "@/fetchers/parity/cycles";
export type CycleGroup = "state" | "assignee" | "project";
export function groupCycleTasks(
  tasks: CycleTask[],
  groupBy: CycleGroup,
  unassigned: string,
) {
  const groups = new Map<
    string,
    { id: string; name: string; tasks: CycleTask[] }
  >();
  for (const task of tasks) {
    const id =
      groupBy === "project"
        ? task.projectId
        : groupBy === "assignee"
          ? (task.userId ?? "unassigned")
          : task.status;
    const name =
      groupBy === "project"
        ? task.projectName
        : groupBy === "assignee"
          ? (task.assigneeName ?? unassigned)
          : task.statusName;
    const group = groups.get(id) ?? { id, name, tasks: [] };
    group.tasks.push(task);
    groups.set(id, group);
  }
  return [...groups.values()];
}

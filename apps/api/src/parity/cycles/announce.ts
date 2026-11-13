import { publishEvent } from "../../events";

export async function announceCycleChanges(
  workspaceId: string,
  tasks: { taskId: string; projectId: string }[] = [],
) {
  const unique = new Map(tasks.map((task) => [task.taskId, task]));
  for (const task of unique.values()) await publishEvent("task.updated", task);
  await publishEvent("parity.workspace_updated", {
    type: "CYCLE_UPDATED",
    workspaceId,
  });
}

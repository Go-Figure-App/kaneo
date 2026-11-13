import { subscribeToEvent } from "../../events";
import { enabledFeatures } from "./features";
import { seedCategories } from "./controllers/columns";
import { syncLifecycle } from "./controllers/sync-lifecycle";
import {
  broadcastWorkspaceEvent,
  type WorkspaceEvent,
} from "./workspace-events";

let initialized = false;
export async function initializeParity() {
  if (initialized || !enabledFeatures().includes("foundation")) return;
  await seedCategories();
  for (const name of [
    "task.status_changed",
    "task.created",
    "task.moved",
    "task.updated",
  ]) {
    await subscribeToEvent<{
      taskId: string;
      projectId?: string;
      fromProjectId?: string;
      toProjectId?: string;
      status?: string;
      oldStatus?: string;
      newStatus?: string;
    }>(name, async (event) => {
      if (!enabledFeatures().includes("foundation")) return;
      const status =
        name === "task.created"
          ? event.status
          : name === "task.updated"
            ? undefined
            : event.newStatus;
      // Capture before awaiting database work; the row may advance again
      // before this handler acquires its lock.
      const transition = status
        ? {
            projectId: event.toProjectId ?? event.projectId,
            previousProjectId: event.fromProjectId ?? event.projectId,
            previousStatus: event.oldStatus,
            status,
            at: new Date(),
          }
        : undefined;
      await syncLifecycle(event.taskId, transition);
    });
  }
  await subscribeToEvent<WorkspaceEvent>(
    "parity.workspace_updated",
    async (event) => {
      if (enabledFeatures().includes("foundation"))
        await broadcastWorkspaceEvent(event);
    },
  );
  initialized = true;
}

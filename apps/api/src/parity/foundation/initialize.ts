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
    await subscribeToEvent<{ taskId: string }>(name, async ({ taskId }) => {
      if (enabledFeatures().includes("foundation")) await syncLifecycle(taskId);
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

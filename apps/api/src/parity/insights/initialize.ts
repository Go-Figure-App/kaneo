import { subscribeToEvent } from "../../events";
import { enabledFeatures } from "../foundation/features";
import { invalidateInsights } from "./cache";

let initialized = false;
export async function initializeInsights() {
  if (initialized || !enabledFeatures().includes("insights")) return;
  for (const event of [
    "task.created",
    "task.updated",
    "task.deleted",
    "task.moved",
    "task.status_changed",
    "task.label_assigned",
    "task.label_unassigned",
    "task.label_created",
    "task.labels_updated",
    "task.bulk_unassigned",
    "project.updated",
    "project.deleted",
    "parity.workspace_updated",
  ])
    await subscribeToEvent(event, async () => {
      // The bounded cache is tiny for a self-hosted team. Clearing it avoids extra
      // project lookups and also covers moves whose former project was deleted.
      invalidateInsights();
    });
  initialized = true;
}

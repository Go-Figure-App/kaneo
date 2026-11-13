import { i18n } from "@/lib/i18n";
import { updateTaskEstimate } from "@/fetchers/parity/cycles";
import { toast } from "@/lib/toast";
export async function applyCreatedEstimate(
  taskId: string,
  estimate: number | null,
  pending: boolean,
) {
  // Pending creation stores its estimate atomically. Upstream task creation
  // has no parity hook; a failed second request must never recreate the issue.
  if (estimate === null || pending) return;
  try {
    await updateTaskEstimate(taskId, estimate);
  } catch {
    toast.warning(i18n.t("parity:views.templateEstimateError"));
  }
}

import { clickTaskAction } from "@/components/task/task-action-target";
import { useShortcut } from "@/lib/shortcuts/use-shortcut";

export function useCycleShortcut(enabled: boolean) {
  useShortcut("changeCycle", () => clickTaskAction("cycle"), { enabled });
}
export function useEstimateShortcut(enabled: boolean) {
  useShortcut("changeEstimate", () => clickTaskAction("estimate"), { enabled });
}

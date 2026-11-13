import { useNavigate } from "@tanstack/react-router";
import useActiveWorkspace from "@/hooks/queries/workspace/use-active-workspace";
import { useShortcut } from "@/lib/shortcuts/use-shortcut";
import { usePlanningEnabled } from "../planning/queries";
import { useTriageEnabled } from "../triage/queries";
export function usePlanningNavigationShortcuts() {
  const { data: workspace } = useActiveWorkspace();
  const navigate = useNavigate();
  const triage = useTriageEnabled();
  const cycles = usePlanningEnabled("cycles");
  const roadmap = usePlanningEnabled("roadmap");
  const views = usePlanningEnabled("views");
  useShortcut(
    "goToTriage",
    () => {
      if (workspace)
        void navigate({
          to: "/dashboard/workspace/$workspaceId/triage",
          params: { workspaceId: workspace.id },
        });
    },
    { enabled: Boolean(workspace) && triage },
  );
  useShortcut(
    "goToCurrentCycle",
    () => {
      if (workspace)
        void navigate({
          to: "/dashboard/workspace/$workspaceId/cycles",
          params: { workspaceId: workspace.id },
          search: { phase: "current" },
        });
    },
    { enabled: Boolean(workspace) && cycles },
  );
  useShortcut(
    "goToRoadmap",
    () => {
      if (workspace)
        void navigate({
          to: "/dashboard/workspace/$workspaceId/roadmap",
          params: { workspaceId: workspace.id },
        });
    },
    { enabled: Boolean(workspace) && roadmap },
  );
  useShortcut(
    "goToViews",
    () => {
      if (workspace)
        void navigate({
          to: "/dashboard/workspace/$workspaceId/views",
          params: { workspaceId: workspace.id },
        });
    },
    { enabled: Boolean(workspace) && views },
  );
}

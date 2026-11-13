import { useState } from "react";
import { Layers } from "lucide-react";
import { useTranslation } from "react-i18next";
import { barButtonClass } from "@/components/bulk-selection/bar-button-class";
import { BarTooltip } from "@/components/bulk-selection/bar-tooltip";
import useProjectStore from "@/store/project";
import { usePlanningEnabled } from "../planning/queries";
import { BulkPlanningDialog } from "./bulk-planning-dialog";

export function BulkPlanningActions({
  selectedTaskIds,
  clearSelection,
}: {
  selectedTaskIds: Set<string>;
  clearSelection: () => void;
}) {
  const { t } = useTranslation();
  const cycles = usePlanningEnabled("cycles");
  const projects = usePlanningEnabled("projects");
  const project = useProjectStore((state) => state.project);
  const [taskIds, setTaskIds] = useState<string[] | null>(null);
  if ((!cycles && !projects) || !project) return null;
  return (
    <>
      <BarTooltip label={t("parity:cycles.bulkPlanning")}>
        <button
          type="button"
          className={barButtonClass}
          onClick={() => setTaskIds([...selectedTaskIds])}
        >
          <Layers />
          <span className="max-lg:sr-only">
            {t("parity:cycles.bulkPlanning")}
          </span>
        </button>
      </BarTooltip>
      {taskIds && (
        <BulkPlanningDialog
          taskIds={taskIds}
          projectId={project.id}
          workspaceId={project.workspaceId}
          cycles={cycles}
          projects={projects}
          onClose={() => setTaskIds(null)}
          onSuccess={clearSelection}
        />
      )}
    </>
  );
}

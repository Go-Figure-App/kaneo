import { type ReactNode, useId } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { DisplaySection } from "@/components/project/display/display-section";
import { DisplayMenu } from "@/components/project/display/display-menu";
import { FilterMenu } from "@/components/project/task-filters/filter-menu";
import { useFilterShortcuts } from "@/components/project/task-filters/use-filter-shortcuts";
import { ProjectSearch } from "./project-search";
import type { ProjectTaskView } from "./use-project-task-view";
import { ProjectCycleFilter } from "@/components/parity/cycles/project-cycle-filter";

type ProjectToolbarProps = {
  view: ProjectTaskView;
  display: ReactNode;
  actions?: ReactNode;
};

export function ProjectToolbar({
  view,
  display,
  actions,
}: ProjectToolbarProps) {
  const { t } = useTranslation();
  const includeSubtasksId = useId();
  useFilterShortcuts(
    [
      ...view.subjects,
      {
        id: "parity-cycle",
        selected:
          view.cycleFilter.value === null ? [] : [view.cycleFilter.value],
        onClear: () => view.cycleFilter.setValue(null),
      },
    ],
    view.filters.clearFilters,
  );

  return (
    <>
      {actions && (
        <>
          {actions}
          <span className="mx-1 h-4 w-px bg-border" aria-hidden="true" />
        </>
      )}
      <ProjectSearch value={view.search} onChange={view.setSearch} />
      <ProjectCycleFilter filter={view.cycleFilter} />
      <FilterMenu
        subjects={view.subjects}
        activeCount={view.filters.activeFilterCount}
      />
      <DisplayMenu>
        <DisplaySection>
          <div className="flex items-center justify-between gap-3">
            <label htmlFor={includeSubtasksId} className="text-sm">
              {t("tasks:display.includeSubtasks")}
            </label>
            <Switch
              id={includeSubtasksId}
              checked={view.filters.includeSubtasks}
              onCheckedChange={view.filters.setIncludeSubtasks}
            />
          </div>
          <Button
            type="button"
            variant="ghost"
            size="xs"
            disabled={!view.filters.hasIncludeSubtasksOverride}
            onClick={() => view.filters.setIncludeSubtasks(null)}
          >
            {t("tasks:display.useProjectDefault")}
          </Button>
        </DisplaySection>
        {display}
      </DisplayMenu>
    </>
  );
}

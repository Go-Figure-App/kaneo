import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import WorkspaceLayout from "@/components/common/workspace-layout";
import PageTitle from "@/components/page-title";
import { parseTaskDate } from "@/components/gantt/timeline";
import { Button } from "@/components/ui/button";
import { getRoadmap, type RoadmapProject } from "@/fetchers/parity/roadmap";
import {
  updateMilestone,
  updateProjectPlan,
  type PlanInput,
} from "@/fetchers/parity/projects";
import { useWorkspacePermission } from "@/hooks/use-workspace-permission";
import { formatDateMedium } from "@/lib/format";
import { isAccessError } from "../foundation/access-error";
import { refreshPlanning, usePlanningEnabled } from "../planning/queries";
import { DatesDialog } from "./dates-dialog";
import { RoadmapFilters } from "./filters";
import { emptyFilters, filteredProjects } from "./grouping";
import {
  navigateWindow,
  dateValue,
  shiftDate,
  timelineWindow,
  zooms,
  type Zoom,
} from "./timeline";
import { TimelineView } from "./timeline-view";
import { Unscheduled } from "./unscheduled";

type Change =
  | { kind: "project"; id: string; patch: PlanInput }
  | { kind: "milestone"; id: string; date: string };
export function RoadmapPage({ workspaceId }: { workspaceId: string }) {
  const { t } = useTranslation();
  const enabled = usePlanningEnabled("roadmap");
  const { canUpdateProjects } = useWorkspacePermission();
  const client = useQueryClient();
  const [anchor, setAnchor] = useState(() => new Date());
  const [zoom, setZoom] = useState<Zoom>("quarter");
  const [filters, setFilters] = useState(emptyFilters);
  const [editingId, setEditingId] = useState<string | null>(null);
  const query = useQuery({
    queryKey: ["parity", "roadmap", workspaceId],
    queryFn: () => getRoadmap(workspaceId),
    enabled,
  });
  const mutation = useMutation({
    mutationKey: ["parity"],
    mutationFn: async (change: Change) => {
      if (change.kind === "project")
        await updateProjectPlan(change.id, change.patch);
      else await updateMilestone(change.id, { targetDate: change.date });
    },
    onSuccess: () => refreshPlanning(client),
  });
  const data = isAccessError(query.error) ? undefined : query.data;
  const projects = filteredProjects(data?.projects ?? [], filters);
  const window = timelineWindow(anchor, zoom);
  const disabled = !canUpdateProjects() || mutation.isPending || query.isError;
  const editing = data?.projects.find((project) => project.id === editingId);
  const labels: Record<Zoom, string> = {
    week: t("parity:roadmap.week"),
    month: t("parity:roadmap.month"),
    quarter: t("parity:roadmap.quarter"),
    year: t("parity:roadmap.year"),
  };
  const edit = (project: RoadmapProject) => setEditingId(project.id);
  return (
    <WorkspaceLayout title={t("parity:roadmap.title")}>
      <PageTitle title={t("parity:roadmap.title")} />
      <div className="flex h-full flex-col gap-4 overflow-auto p-4 sm:p-6">
        {!enabled ? (
          <p>{t("parity:planning.unavailable")}</p>
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Button
                  size="icon"
                  variant="outline"
                  aria-label={t("parity:roadmap.previous")}
                  onClick={() => setAnchor(navigateWindow(anchor, zoom, -1))}
                >
                  <ChevronLeft className="size-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setAnchor(new Date())}
                >
                  {t("parity:roadmap.today")}
                </Button>
                <Button
                  size="icon"
                  variant="outline"
                  aria-label={t("parity:roadmap.next")}
                  onClick={() => setAnchor(navigateWindow(anchor, zoom, 1))}
                >
                  <ChevronRight className="size-4" />
                </Button>
                <span className="ml-2 text-xs text-muted-foreground">
                  {formatDateMedium(window.start)} –{" "}
                  {formatDateMedium(window.end)}
                </span>
                <input
                  type="date"
                  min="0001-01-01"
                  max="9999-12-31"
                  aria-label={t("parity:roadmap.jumpToDate")}
                  value={dateValue(anchor)}
                  onChange={(event) => {
                    const date = parseTaskDate(event.target.value);
                    if (date) setAnchor(date);
                  }}
                  className="h-8 rounded-md border bg-background px-2 text-xs"
                />
              </div>
              <select
                aria-label={t("parity:roadmap.zoom")}
                value={zoom}
                onChange={(event) => setZoom(event.target.value as Zoom)}
                className="h-8 rounded-md border bg-background px-2 text-xs"
              >
                {zooms.map((value) => (
                  <option key={value} value={value}>
                    {labels[value]}
                  </option>
                ))}
              </select>
            </div>
            {data && (
              <RoadmapFilters
                data={data}
                filters={filters}
                onChange={setFilters}
              />
            )}
            <p id="roadmap-edit-help" className="text-xs text-muted-foreground">
              {canUpdateProjects()
                ? t("parity:roadmap.editHint")
                : t("parity:roadmap.readOnly")}
            </p>
            {query.isPending && (
              <p role="status">{t("parity:planning.loading")}</p>
            )}
            {query.error && (
              <div role="alert" className="text-sm">
                {query.error.message}
                <Button variant="ghost" onClick={() => query.refetch()}>
                  {t("parity:planning.retry")}
                </Button>
              </div>
            )}
            {mutation.error && (
              <p role="alert" className="text-sm text-destructive">
                {mutation.error.message}
              </p>
            )}
            {data && (
              <>
                {projects.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    {t("parity:roadmap.noProjects")}
                  </p>
                )}
                <div className="flex min-h-80 flex-1 flex-col items-start gap-4 lg:flex-row">
                  <TimelineView
                    projects={projects}
                    initiatives={data.initiatives}
                    selected={filters.initiative}
                    window={window}
                    zoom={zoom}
                    disabled={disabled}
                    onEdit={edit}
                    onProject={(id, patch) =>
                      mutation.mutate({ kind: "project", id, patch })
                    }
                    onMilestone={(id, date) =>
                      mutation.mutate({ kind: "milestone", id, date })
                    }
                    onSchedule={(id, date) =>
                      mutation.mutate({
                        kind: "project",
                        id,
                        patch: {
                          startDate: date,
                          targetDate: shiftDate(date, 6),
                        },
                      })
                    }
                  />
                  <Unscheduled
                    projects={projects}
                    disabled={disabled}
                    onEdit={edit}
                  />
                </div>
              </>
            )}
          </>
        )}
      </div>
      {enabled && editing && !disabled && (
        <DatesDialog
          key={editing.id}
          project={editing}
          onClose={() => setEditingId(null)}
        />
      )}
    </WorkspaceLayout>
  );
}

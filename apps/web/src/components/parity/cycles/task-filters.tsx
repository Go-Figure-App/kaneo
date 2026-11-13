import { useTranslation } from "react-i18next";
import type { CycleTaskFilters } from "@/fetchers/parity/cycles";
import useGetProjects from "@/hooks/queries/project/use-get-projects";
import useGetWorkspaceUsers from "@/hooks/queries/workspace-users/use-get-workspace-users";
import { getPriorityLabel } from "@/lib/i18n/domain";
import type { CycleGroup } from "./group-tasks";

export function CycleTaskFiltersBar({
  workspaceId,
  filters,
  setFilters,
  groupBy,
  setGroupBy,
}: {
  workspaceId: string;
  filters: CycleTaskFilters;
  setFilters: (filters: CycleTaskFilters) => void;
  groupBy: CycleGroup;
  setGroupBy: (group: CycleGroup) => void;
}) {
  const { t } = useTranslation();
  const projects = useGetProjects({ workspaceId });
  const members = useGetWorkspaceUsers({ workspaceId });
  const field = "h-8 min-w-0 rounded-md border bg-background px-2 text-xs";
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <input
          aria-label={t("parity:cycles.searchTasks")}
          placeholder={t("parity:cycles.searchTasks")}
          value={filters.search ?? ""}
          onChange={(event) =>
            setFilters({ ...filters, search: event.target.value })
          }
          maxLength={200}
          className={`${field} min-w-40 flex-1`}
        />
        <select
          aria-label={t("parity:cycles.groupBy")}
          className={field}
          value={groupBy}
          onChange={(event) => setGroupBy(event.target.value as CycleGroup)}
        >
          {(["state", "assignee", "project"] as const).map((value) => (
            <option key={value} value={value}>
              {t("parity:cycles.groupBy")}: {t(`parity:cycles.${value}`)}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-wrap gap-2">
        <select
          aria-label={t("parity:cycles.project")}
          className={field}
          value={filters.projectId ?? ""}
          onChange={(event) => {
            if (!event.target.value || !projects.isError)
              setFilters({
                ...filters,
                projectId: event.target.value || undefined,
              });
          }}
        >
          <option value="">{t("parity:cycles.allProjects")}</option>
          {projects.isError && filters.projectId && (
            <option value={filters.projectId} disabled>
              {t("parity:cycles.project")}
            </option>
          )}
          {!projects.isError &&
            projects.data?.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
        </select>
        <select
          aria-label={t("parity:cycles.assignee")}
          className={field}
          value={filters.assigneeId ?? ""}
          onChange={(event) => {
            if (
              !event.target.value ||
              event.target.value === "unassigned" ||
              !members.isError
            )
              setFilters({
                ...filters,
                assigneeId: event.target.value || undefined,
              });
          }}
        >
          <option value="">{t("parity:cycles.allAssignees")}</option>
          <option value="unassigned">{t("parity:cycles.unassigned")}</option>
          {members.isError &&
            filters.assigneeId &&
            filters.assigneeId !== "unassigned" && (
              <option value={filters.assigneeId} disabled>
                {t("parity:cycles.assignee")}
              </option>
            )}
          {!members.isError &&
            members.data?.map((member) => (
              <option key={member.userId} value={member.userId}>
                {member.user.name}
              </option>
            ))}
        </select>
        <select
          aria-label={t("parity:cycles.state")}
          className={field}
          value={filters.category ?? ""}
          onChange={(event) =>
            setFilters({
              ...filters,
              category:
                (event.target.value as CycleTaskFilters["category"]) ||
                undefined,
            })
          }
        >
          <option value="">{t("parity:cycles.allStates")}</option>
          {(
            [
              ["backlog", "statusBacklog"],
              ["unstarted", "statusUnstarted"],
              ["started", "statusStarted"],
              ["completed", "statusCompleted"],
              ["canceled", "statusCanceled"],
            ] as const
          ).map(([value, key]) => (
            <option key={value} value={value}>
              {t(`parity:cycles.${key}`)}
            </option>
          ))}
        </select>
        <select
          aria-label={t("tasks:priority.label")}
          className={field}
          value={filters.priority ?? ""}
          onChange={(event) =>
            setFilters({
              ...filters,
              priority:
                (event.target.value as CycleTaskFilters["priority"]) ||
                undefined,
            })
          }
        >
          <option value="">{t("parity:cycles.allPriorities")}</option>
          {(["urgent", "high", "medium", "low", "no-priority"] as const).map(
            (value) => (
              <option key={value} value={value}>
                {getPriorityLabel(value)}
              </option>
            ),
          )}
        </select>
        <input
          aria-label={t("parity:cycles.label")}
          className={field}
          placeholder={t("parity:cycles.labelPlaceholder")}
          value={filters.label ?? ""}
          onChange={(event) =>
            setFilters({ ...filters, label: event.target.value || undefined })
          }
          maxLength={200}
        />
      </div>
      {(projects.error || members.error) && (
        <p role="alert" className="text-xs text-destructive">
          {projects.error?.message ?? members.error?.message}
        </p>
      )}
    </div>
  );
}

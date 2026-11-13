import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import type { ViewDisplay, WorkspaceTask } from "@/fetchers/parity/views";
import { getPriorityLabel } from "@/lib/i18n/domain";
import { groupWorkspaceTasks } from "./display";
import { FavoriteButton } from "./favorite-button";
export function TaskCollection({
  tasks,
  workspaceId,
  display,
  timeZone,
}: {
  tasks: WorkspaceTask[];
  workspaceId: string;
  display: ViewDisplay;
  timeZone: string;
}) {
  const { t, i18n } = useTranslation();
  const missing = t(
    display.groupBy === "label"
      ? "parity:views.noLabel"
      : display.groupBy === "cycle"
        ? "parity:views.noCycle"
        : "parity:views.unassigned",
  );
  const groups = groupWorkspaceTasks(tasks, display.groupBy, missing);
  const property = (
    task: WorkspaceTask,
    key: ViewDisplay["properties"][number],
  ) => {
    switch (key) {
      case "identifier":
        return `${task.projectSlug.toUpperCase()}-${task.number ?? ""}`;
      case "status":
        return task.statusName;
      case "priority":
        return getPriorityLabel(task.priority);
      case "assignee":
        return task.assigneeName ?? t("parity:views.unassigned");
      case "project":
        return task.projectName;
      case "cycle":
        return task.cycleName;
      case "milestone":
        return task.milestoneName;
      case "estimate":
        return task.estimate === null
          ? null
          : new Intl.NumberFormat(i18n.language).format(task.estimate);
      case "labels":
        return task.labels.map((label) => label.name).join(", ");
      case "due":
        return task.dueDate
          ? new Intl.DateTimeFormat(i18n.language, {
              timeZone,
              dateStyle: "medium",
            }).format(new Date(task.dueDate))
          : null;
    }
  };
  return (
    <div
      className={
        display.layout === "board"
          ? "flex items-start gap-4 overflow-x-auto pb-4"
          : "space-y-4"
      }
    >
      {groups.map((group) => (
        <section
          key={group.id}
          aria-label={
            display.groupBy === "priority"
              ? getPriorityLabel(group.name)
              : group.name
          }
          className={
            display.layout === "board"
              ? "w-80 shrink-0 rounded-lg bg-muted/40 p-2"
              : "overflow-hidden rounded-lg border"
          }
        >
          <h2 className="flex items-center gap-2 bg-muted/40 px-3 py-2 text-xs font-medium">
            {display.groupBy === "priority"
              ? getPriorityLabel(group.name)
              : group.name}
            <span className="text-muted-foreground">{group.tasks.length}</span>
          </h2>
          <div
            className={display.layout === "board" ? "space-y-2" : "divide-y"}
          >
            {group.tasks.map((task) => (
              <div
                key={task.id}
                className={
                  display.layout === "board"
                    ? "flex items-start rounded-md border bg-background shadow-sm"
                    : "flex items-center hover:bg-accent/40"
                }
              >
                <Link
                  className="min-w-0 flex-1 space-y-2 p-3 focus-visible:outline focus-visible:outline-2"
                  to="/dashboard/workspace/$workspaceId/project/$projectId/task/$taskId"
                  params={{
                    workspaceId,
                    projectId: task.projectId,
                    taskId: task.id,
                  }}
                >
                  <span className="block text-sm font-medium">
                    {task.title}
                  </span>
                  <span className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    {display.properties.map((key) => {
                      const value = property(task, key);
                      return value ? (
                        <span
                          key={key}
                          title={t(`parity:views.propertyNames.${key}`)}
                          className="max-w-48 truncate"
                        >
                          {value}
                        </span>
                      ) : null;
                    })}
                  </span>
                </Link>
                <div className="p-1">
                  <FavoriteButton
                    workspaceId={workspaceId}
                    kind="task"
                    targetId={task.id}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { getParityColumns } from "@/fetchers/parity/foundation";
import {
  decideTriage,
  type TriageDecision,
  type TriageItem,
} from "@/fetchers/parity/triage";
import globalSearch from "@/fetchers/search/global-search";
import useGetProjectMembers from "@/hooks/queries/workspace-users/use-get-project-members";
import { useWorkspacePermission } from "@/hooks/use-workspace-permission";
import { getPriorityLabel } from "@/lib/i18n/domain";
import { refreshTriage } from "./queries";

export function TriageDecisionForm({
  item,
  workspaceId,
  action,
  onDone,
}: {
  item: TriageItem;
  workspaceId: string;
  action: TriageDecision["action"];
  onDone: () => void;
}) {
  const { t } = useTranslation();
  const client = useQueryClient();
  const { canAssignTasks } = useWorkspacePermission();
  const [columnId, setColumnId] = useState("");
  const [assigneeId, setAssigneeId] = useState(item.userId ?? "");
  const [priority, setPriority] = useState(
    item.priority as NonNullable<
      Extract<TriageDecision, { action: "accept" }>["body"]["priority"]
    >,
  );
  const [comment, setComment] = useState("");
  const [search, setSearch] = useState("");
  const [originalId, setOriginalId] = useState("");
  const [until, setUntil] = useState("");
  const columns = useQuery({
    queryKey: ["parity", "columns", item.projectId],
    queryFn: () => getParityColumns(item.projectId),
    enabled: action === "accept",
  });
  const members = useGetProjectMembers({
    workspaceId,
    projectId: item.projectId,
  });
  const results = useQuery({
    queryKey: ["parity", "triage", workspaceId, "search", search],
    queryFn: () =>
      globalSearch({ q: search, workspaceId, type: "tasks", limit: 20 }),
    enabled: action === "duplicate" && search.trim().length > 1,
  });
  const selectedColumn =
    columns.data?.find((column) => column.id === columnId)?.id ??
    columns.data?.find((column) => column.category === "unstarted")?.id ??
    columns.data?.[0]?.id;
  const mutation = useMutation({
    mutationFn: (decision: TriageDecision) => decideTriage(item.id, decision),
    onSuccess: async () => {
      await refreshTriage(client);
      onDone();
    },
  });
  const valid =
    action === "accept"
      ? Boolean(selectedColumn)
      : action === "duplicate"
        ? Boolean(originalId)
        : action === "decline"
          ? Boolean(comment.trim())
          : Boolean(until && new Date(until).getTime() > Date.now());
  const label =
    action === "accept"
      ? t("parity:triage.accept")
      : action === "duplicate"
        ? t("parity:triage.duplicate")
        : action === "decline"
          ? t("parity:triage.decline")
          : t("parity:triage.snooze");
  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        if (!valid || mutation.isPending) return;
        const decision: TriageDecision =
          action === "accept"
            ? {
                action,
                body: {
                  columnId: selectedColumn!,
                  priority,
                  ...(canAssignTasks()
                    ? { assigneeId: assigneeId || null }
                    : {}),
                },
              }
            : action === "duplicate"
              ? { action, body: { duplicateOfTaskId: originalId } }
              : action === "decline"
                ? { action, body: { comment } }
                : { action, body: { until: new Date(until).toISOString() } };
        mutation.mutate(decision);
      }}
    >
      {action === "accept" && (
        <>
          <label className="flex flex-col gap-1 text-sm">
            {t("tasks:status.label")}
            <select
              className="rounded-md border bg-background p-2"
              value={selectedColumn ?? ""}
              onChange={(event) => setColumnId(event.target.value)}
              required
            >
              {columns.data?.map((column) => (
                <option key={column.id} value={column.id}>
                  {column.name}
                </option>
              ))}
            </select>
          </label>
          {canAssignTasks() && (
            <label className="flex flex-col gap-1 text-sm">
              {t("tasks:assignee.label")}
              <select
                className="rounded-md border bg-background p-2"
                value={assigneeId}
                onChange={(event) => setAssigneeId(event.target.value)}
              >
                <option value="">{t("tasks:assignee.unassigned")}</option>
                {members.data?.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label className="flex flex-col gap-1 text-sm">
            {t("tasks:priority.label")}
            <select
              className="rounded-md border bg-background p-2"
              value={priority}
              onChange={(event) =>
                setPriority(event.target.value as typeof priority)
              }
            >
              {(
                ["no-priority", "low", "medium", "high", "urgent"] as const
              ).map((value) => (
                <option key={value} value={value}>
                  {getPriorityLabel(value)}
                </option>
              ))}
            </select>
          </label>
        </>
      )}
      {action === "decline" && (
        <label className="flex flex-col gap-1 text-sm">
          {t("parity:triage.comment")}
          <textarea
            autoFocus
            required
            className="min-h-24 rounded-md border bg-background p-2"
            value={comment}
            maxLength={10000}
            onChange={(event) => setComment(event.target.value)}
          />
        </label>
      )}
      {action === "snooze" && (
        <label className="flex flex-col gap-1 text-sm">
          {t("parity:triage.until")}
          <input
            autoFocus
            required
            type="datetime-local"
            className="rounded-md border bg-background p-2"
            value={until}
            onChange={(event) => setUntil(event.target.value)}
          />
        </label>
      )}
      {action === "duplicate" && (
        <>
          <label className="flex flex-col gap-1 text-sm">
            {t("parity:triage.original")}
            <input
              autoFocus
              type="search"
              className="rounded-md border bg-background p-2"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setOriginalId("");
              }}
            />
          </label>
          <div className="max-h-60 overflow-y-auto">
            {results.data?.results
              .filter((task) => task.id !== item.id)
              .map((task) => (
                <label
                  key={task.id}
                  className="flex items-start gap-2 rounded-md p-2 hover:bg-accent"
                >
                  <input
                    type="radio"
                    name="original"
                    checked={originalId === task.id}
                    onChange={() => setOriginalId(task.id)}
                  />
                  <span className="text-sm">
                    {task.projectSlug?.toUpperCase()}-{task.taskNumber} ·{" "}
                    {task.title}
                  </span>
                </label>
              ))}
          </div>
        </>
      )}
      {mutation.error || columns.error || results.error ? (
        <p role="alert" className="text-destructive">
          {mutation.error?.message ??
            columns.error?.message ??
            results.error?.message}
        </p>
      ) : null}
      <Button type="submit" disabled={!valid || mutation.isPending}>
        {label}
      </Button>
    </form>
  );
}

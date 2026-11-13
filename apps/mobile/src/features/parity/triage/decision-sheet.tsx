import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { TextInput, View } from "react-native";
import { Calendar } from "@/components/pickers";
import { Loading } from "@/components/screen";
import { Sheet } from "@/components/sheet";
import { Txt } from "@/components/text";
import { Button, Touch } from "@/components/ui";
import { api } from "@/lib/api/endpoints";
import { useMembers } from "@/lib/hooks";
import { useAction } from "@/lib/query";
import { PRIORITIES, priorityLabel } from "@/lib/style";
import { useColors } from "@/theme";
import { triageApi, type TriageDecision, type TriageItem } from "./api";

export function TriageDecisionSheet({
  workspaceId,
  item,
  action: initialAction,
  canAssign,
  onClose,
}: {
  workspaceId: string;
  item: TriageItem;
  action: TriageDecision["action"] | "menu";
  canAssign: boolean;
  onClose: () => void;
}) {
  const { t } = useTranslation(["mobile"]);
  const c = useColors();
  const { run, busy } = useAction();
  const [action, setAction] = useState(initialAction);
  const [columnId, setColumnId] = useState("");
  const [assigneeId, setAssigneeId] = useState(item.userId);
  const [priority, setPriority] = useState(item.priority);
  const [comment, setComment] = useState("");
  const [query, setQuery] = useState("");
  const [duplicateId, setDuplicateId] = useState("");
  const [until, setUntil] = useState("");
  const columns = useQuery({
    queryKey: ["parity", "columns", item.projectId],
    queryFn: () => triageApi.columns(item.projectId),
    enabled: action === "accept",
  });
  const members = useMembers(workspaceId, item.projectId);
  const searchEnabled = action === "duplicate" && query.trim().length > 1;
  const search = useQuery({
    queryKey: ["parity", "triage", workspaceId, "search", query],
    queryFn: () => api.search(query, workspaceId, "tasks"),
    enabled: searchEnabled,
  });
  const duplicateResults =
    search.data?.results.filter((task) => task.id !== item.id) ?? [];
  const selectedColumn =
    columns.data?.find((column) => column.id === columnId)?.id ??
    columns.data?.find((column) => column.category === "unstarted")?.id ??
    columns.data?.[0]?.id;
  const valid =
    action === "accept"
      ? Boolean(selectedColumn)
      : action === "decline"
        ? Boolean(comment.trim())
        : action === "duplicate"
          ? Boolean(duplicateId)
          : Boolean(until && new Date(until).getTime() > Date.now());
  const labels = {
    accept: t("mobile:parity.triage.accept"),
    decline: t("mobile:parity.triage.decline"),
    duplicate: t("mobile:parity.triage.duplicate"),
    snooze: t("mobile:parity.triage.snooze"),
  };
  const inputStyle = {
    color: c.ink,
    borderColor: c.hairline,
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  };
  const choice = (
    id: string,
    label: string,
    selected: boolean,
    choose: () => void,
  ) => (
    <Touch
      key={id}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      disabled={busy}
      onPress={choose}
      style={{
        padding: 12,
        borderRadius: 8,
        backgroundColor: selected ? c.fillStrong : c.fill,
      }}
    >
      <Txt variant="bodySm" weight={selected ? "semibold" : "regular"}>
        {label}
      </Txt>
    </Touch>
  );
  return (
    <Sheet
      visible
      onClose={() => {
        if (!busy) onClose();
      }}
      title={
        action === "menu" ? t("mobile:parity.triage.title") : labels[action]
      }
    >
      {action === "menu" ? (
        <View style={{ padding: 20, gap: 12 }}>
          {(["accept", "duplicate", "decline", "snooze"] as const).map(
            (value) => (
              <Button
                key={value}
                label={labels[value]}
                kind={value === "decline" ? "danger" : "secondary"}
                onPress={() => setAction(value)}
              />
            ),
          )}
        </View>
      ) : (
        <View style={{ padding: 20, gap: 16 }}>
          <Txt variant="bodySm" tone="muted">
            {item.title}
          </Txt>
          {action === "accept" && (
            <>
              <View style={{ gap: 6 }}>
                <Txt variant="meta" tone="muted">
                  {t("mobile:taskFields.status")}
                </Txt>
                {columns.data?.map((column) =>
                  choice(
                    column.id,
                    column.name,
                    selectedColumn === column.id,
                    () => setColumnId(column.id),
                  ),
                )}
              </View>
              {canAssign && (
                <View style={{ gap: 6 }}>
                  <Txt variant="meta" tone="muted">
                    {t("mobile:taskFields.assignee")}
                  </Txt>
                  {choice(
                    "none",
                    t("mobile:taskFields.unassigned"),
                    assigneeId === null,
                    () => setAssigneeId(null),
                  )}
                  {members.data?.map((member) =>
                    choice(
                      member.id,
                      member.name,
                      assigneeId === member.id,
                      () => setAssigneeId(member.id),
                    ),
                  )}
                </View>
              )}
              <View style={{ gap: 6 }}>
                <Txt variant="meta" tone="muted">
                  {t("mobile:taskFields.priority")}
                </Txt>
                {PRIORITIES.map(({ value }) =>
                  choice(value, priorityLabel(value), priority === value, () =>
                    setPriority(value),
                  ),
                )}
              </View>
            </>
          )}
          {action === "decline" && (
            <>
              <Txt variant="meta">{t("mobile:parity.triage.comment")}</Txt>
              <TextInput
                accessibilityLabel={t("mobile:parity.triage.comment")}
                style={{ ...inputStyle, minHeight: 100 }}
                multiline
                autoFocus
                value={comment}
                maxLength={10000}
                onChangeText={setComment}
              />
            </>
          )}
          {action === "duplicate" && (
            <>
              <TextInput
                accessibilityLabel={t("mobile:parity.triage.original")}
                placeholder={t("mobile:parity.triage.original")}
                placeholderTextColor={c.placeholder}
                style={inputStyle}
                autoFocus
                value={query}
                onChangeText={(value) => {
                  setQuery(value);
                  setDuplicateId("");
                }}
              />
              {searchEnabled && search.isPending && <Loading />}
              {searchEnabled &&
                search.isSuccess &&
                duplicateResults.length === 0 && (
                  <Txt tone="muted">
                    {t("mobile:search.noResults", { query })}
                  </Txt>
                )}
              {duplicateResults.map((task) =>
                choice(
                  task.id,
                  `${task.projectSlug?.toUpperCase()}-${task.taskNumber} · ${task.title}`,
                  duplicateId === task.id,
                  () => setDuplicateId(task.id),
                ),
              )}
            </>
          )}
          {action === "snooze" && (
            <Calendar
              value={until || undefined}
              onPick={(day) =>
                setUntil(new Date(day.y, day.m, day.d, 9).toISOString())
              }
            />
          )}
          {((action === "accept" && columns.isError) ||
            (searchEnabled && search.isError)) && (
            <View style={{ gap: 8 }}>
              <Txt tone="danger">{t("mobile:common.somethingWrong")}</Txt>
              <Button
                kind="secondary"
                label={t("mobile:common.retry")}
                onPress={() =>
                  void (action === "accept"
                    ? columns.refetch()
                    : search.refetch())
                }
              />
            </View>
          )}
          <Button
            label={labels[action]}
            disabled={!valid || busy}
            loading={busy}
            onPress={() => {
              if (!valid || busy) return;
              const decision: TriageDecision =
                action === "accept"
                  ? {
                      action,
                      body: {
                        columnId: selectedColumn!,
                        priority,
                        ...(canAssign ? { assigneeId } : {}),
                      },
                    }
                  : action === "decline"
                    ? { action, body: { comment } }
                    : action === "duplicate"
                      ? { action, body: { duplicateOfTaskId: duplicateId } }
                      : { action, body: { until } };
              void run(() => triageApi.decide(item.id, decision)).then(
                (result) => {
                  if (result) onClose();
                },
              );
            }}
          />
        </View>
      )}
    </Sheet>
  );
}

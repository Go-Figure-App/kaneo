import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { TextInput, View } from "react-native";
import { OptionSheet, Sheet } from "@/components/sheet";
import { ErrorState, Loading } from "@/components/screen";
import { Txt } from "@/components/text";
import { Touch } from "@/components/ui";
import { api } from "@/lib/api/endpoints";
import { userMessage } from "@/lib/api/client";
import { qk } from "@/lib/query";
import { priorityLabel } from "@/lib/style";
import { useColors } from "@/theme";
import type { CycleTaskFilters } from "./types";

type Filter = "projectId" | "assigneeId" | "category" | "priority";
export function CycleTaskFiltersBar({
  workspaceId,
  filters,
  onChange,
  assignedOnly,
}: {
  workspaceId: string;
  filters: CycleTaskFilters;
  onChange: (filters: CycleTaskFilters) => void;
  assignedOnly: boolean;
}) {
  const { t } = useTranslation(["mobile"]);
  const c = useColors();
  const [picker, setPicker] = useState<Filter | null>(null);
  const projects = useQuery({
    queryKey: qk.projects(workspaceId),
    queryFn: () => api.projects(workspaceId),
    enabled: picker === "projectId",
  });
  const members = useQuery({
    queryKey: qk.members(workspaceId),
    queryFn: () => api.workspaceMembers(workspaceId),
    enabled: picker === "assigneeId",
  });
  const options = {
    projectId: [
      { value: "", label: t("mobile:parity.cycles.allProjects") },
      ...(projects.isError ? [] : (projects.data ?? [])).map((project) => ({
        value: project.id,
        label: project.name,
      })),
    ],
    assigneeId: [
      { value: "", label: t("mobile:parity.cycles.allAssignees") },
      { value: "unassigned", label: t("mobile:parity.cycles.unassigned") },
      ...(members.isError ? [] : (members.data ?? [])).map((member) => ({
        value: member.id,
        label: member.name,
      })),
    ],
    category: [
      { value: "", label: t("mobile:parity.cycles.allStates") },
      { value: "backlog", label: t("mobile:parity.cycles.statusBacklog") },
      { value: "unstarted", label: t("mobile:parity.cycles.statusUnstarted") },
      { value: "started", label: t("mobile:parity.cycles.statusStarted") },
      { value: "completed", label: t("mobile:parity.cycles.statusCompleted") },
      { value: "canceled", label: t("mobile:parity.cycles.statusCanceled") },
    ],
    priority: [
      { value: "", label: t("mobile:parity.cycles.allPriorities") },
      ...(["urgent", "high", "medium", "low", "no-priority"] as const).map(
        (value) => ({ value, label: priorityLabel(value) }),
      ),
    ],
  };
  const labels = {
    projectId: t("mobile:parity.cycles.project"),
    assigneeId: t("mobile:parity.cycles.assignee"),
    category: t("mobile:parity.cycles.state"),
    priority: t("mobile:taskFields.priority"),
  };
  const error =
    picker === "projectId"
      ? projects.error
      : picker === "assigneeId"
        ? members.error
        : null;
  const loading =
    picker === "projectId"
      ? projects.isPending
      : picker === "assigneeId"
        ? members.isPending
        : false;
  return (
    <View style={{ gap: 10 }}>
      <TextInput
        accessibilityLabel={t("mobile:parity.cycles.searchTasks")}
        placeholder={t("mobile:parity.cycles.searchTasks")}
        placeholderTextColor={c.faint}
        value={filters.search ?? ""}
        onChangeText={(search) => onChange({ ...filters, search })}
        maxLength={200}
        style={{
          padding: 12,
          borderRadius: 8,
          backgroundColor: c.fill,
          color: c.ink,
        }}
      />
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {(["projectId", "assigneeId", "category", "priority"] as const)
          .filter((key) => !assignedOnly || key !== "assigneeId")
          .map((key) => (
            <Touch
              key={key}
              accessibilityRole="button"
              accessibilityLabel={labels[key]}
              onPress={() => setPicker(key)}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: 8,
                backgroundColor: filters[key] ? c.fillStrong : c.fill,
              }}
            >
              <Txt variant="caption">
                {filters[key]
                  ? (options[key].find((item) => item.value === filters[key])
                      ?.label ?? labels[key])
                  : labels[key]}
              </Txt>
            </Touch>
          ))}
      </View>
      <TextInput
        accessibilityLabel={t("mobile:parity.cycles.label")}
        placeholder={t("mobile:parity.cycles.labelPlaceholder")}
        placeholderTextColor={c.faint}
        value={filters.label ?? ""}
        onChangeText={(label) =>
          onChange({ ...filters, label: label || undefined })
        }
        maxLength={200}
        style={{
          padding: 12,
          borderRadius: 8,
          backgroundColor: c.fill,
          color: c.ink,
        }}
      />
      {picker && (error || loading) ? (
        <Sheet visible title={labels[picker]} onClose={() => setPicker(null)}>
          {error ? (
            <ErrorState
              message={userMessage(error)}
              onRetry={() => {
                if (picker === "projectId") void projects.refetch();
                else void members.refetch();
              }}
            />
          ) : (
            <Loading />
          )}
        </Sheet>
      ) : (
        picker && (
          <OptionSheet
            visible
            title={labels[picker]}
            options={options[picker]}
            selected={filters[picker] ?? ""}
            searchable
            onClose={() => setPicker(null)}
            onSelect={(value) =>
              onChange({ ...filters, [picker]: value || undefined })
            }
          />
        )
      )}
    </View>
  );
}

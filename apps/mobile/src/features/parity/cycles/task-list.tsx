import { useInfiniteQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { useState, type ReactElement } from "react";
import { useTranslation } from "react-i18next";
import { SectionList, View } from "react-native";
import { ErrorState, Loading } from "@/components/screen";
import { TaskRow, ListGroupHeader } from "@/components/rows";
import { Txt } from "@/components/text";
import { Button, Segmented } from "@/components/ui";
import { userMessage } from "@/lib/api/client";
import { currentLocale } from "@/lib/i18n";
import { ticketId } from "@/lib/format";
import { uniquePageItems } from "../planning/unique-page-items";
import { cyclesApi } from "./api";
import { estimateLabel } from "./estimates";
import { groupCycleTasks, type CycleGroup } from "./group-tasks";
import { CycleTaskFiltersBar } from "./task-filters";
import type { CycleSettings, CycleTaskFilters } from "./types";
import { useCycleFocus } from "./use-cycle-focus";

export function CycleTaskList({
  cycleId,
  workspaceId,
  settings,
  header,
  assigneeId,
  refreshing = false,
  onRefresh,
}: {
  cycleId: string;
  workspaceId: string;
  settings: CycleSettings;
  header?: ReactElement;
  assigneeId?: string;
  refreshing?: boolean;
  onRefresh?: () => void;
}) {
  const { t } = useTranslation(["mobile"]);
  const [groupBy, setGroupBy] = useState<CycleGroup>("state");
  const [filters, setFilters] = useState<CycleTaskFilters>({});
  const effective = { ...filters, ...(assigneeId ? { assigneeId } : {}) };
  const query = useInfiniteQuery({
    queryKey: ["parity", "cycle-tasks", cycleId, effective],
    queryFn: ({ pageParam }) => cyclesApi.tasks(cycleId, pageParam, effective),
    initialPageParam: 1,
    getNextPageParam: (page) => (page.hasMore ? page.page + 1 : undefined),
  });
  const items = query.isError ? [] : uniquePageItems(query.data?.pages);
  useCycleFocus(query.refetch);
  const sections = groupCycleTasks(
    items,
    groupBy,
    t("mobile:parity.cycles.unassigned"),
  ).map((group) => ({ key: group.id, title: group.name, data: group.tasks }));
  return (
    <SectionList
      sections={sections}
      keyExtractor={(item) => item.id}
      stickySectionHeadersEnabled={false}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{ paddingBottom: 40 }}
      refreshing={refreshing || query.isRefetching}
      onRefresh={() => {
        void query.refetch();
        onRefresh?.();
      }}
      ListHeaderComponent={
        <View style={{ paddingHorizontal: 20, gap: 20, paddingBottom: 16 }}>
          {header}
          <Txt variant="section">{t("mobile:parity.cycles.tasks")}</Txt>
          <Segmented
            value={groupBy}
            onChange={setGroupBy}
            options={(["state", "assignee", "project"] as const).map(
              (value) => ({ value, label: t(`mobile:parity.cycles.${value}`) }),
            )}
          />
          <CycleTaskFiltersBar
            workspaceId={workspaceId}
            filters={filters}
            onChange={setFilters}
            assignedOnly={Boolean(assigneeId)}
          />
        </View>
      }
      ListEmptyComponent={
        query.isPending ? (
          <Loading />
        ) : query.error ? (
          <ErrorState
            message={userMessage(query.error)}
            onRetry={query.refetch}
          />
        ) : (
          <Txt center tone="muted" style={{ padding: 24 }}>
            {assigneeId
              ? t("mobile:parity.cycles.emptyAssigned")
              : t("mobile:parity.cycles.noTasks")}
          </Txt>
        )
      }
      renderSectionHeader={({ section }) => (
        <ListGroupHeader title={section.title} count={section.data.length} />
      )}
      renderItem={({ item }) => (
        <View>
          <TaskRow
            title={item.title}
            ticket={ticketId(item.projectSlug, item.number)}
            project={groupBy === "project" ? null : item.projectName}
            status={item.status}
            priority={item.priority}
            dueDate={item.dueDate}
            onPress={() =>
              router.push({
                pathname: "/task/[taskId]",
                params: { taskId: item.id },
              })
            }
          />
          {settings.estimateScale !== "none" && item.estimate !== null && (
            <Txt
              variant="caption"
              tone="muted"
              style={{ paddingHorizontal: 20, paddingBottom: 8 }}
            >
              {t("mobile:parity.cycles.estimate")}:{" "}
              {estimateLabel(
                item.estimate,
                settings.estimateScale,
                currentLocale(),
              )}
            </Txt>
          )}
        </View>
      )}
      ListFooterComponent={
        query.hasNextPage && !query.error ? (
          <View style={{ padding: 20 }}>
            <Button
              label={t("mobile:parity.cycles.loadMore")}
              kind="secondary"
              loading={query.isFetchingNextPage}
              onPress={() => void query.fetchNextPage()}
            />
          </View>
        ) : undefined
      }
    />
  );
}

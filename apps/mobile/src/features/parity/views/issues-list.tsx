import { useInfiniteQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { FlatList, View } from "react-native";
import { TaskRow } from "@/components/rows";
import { EmptyState, ErrorState, Loading } from "@/components/screen";
import { Txt } from "@/components/text";
import { Button } from "@/components/ui";
import { userMessage } from "@/lib/api/client";
import { ticketId } from "@/lib/format";
import { useCycleFocus } from "../cycles/queries";
import { uniquePageItems } from "../planning/unique-page-items";
import { viewsApi } from "./api";
import type { SavedView } from "./types";
export function IssuesList({
  workspaceId,
  view,
  onRefresh,
  refreshing = false,
}: {
  workspaceId: string;
  view?: SavedView;
  onRefresh?: () => void;
  refreshing?: boolean;
}) {
  const { t } = useTranslation(["mobile"]);
  const query = useInfiniteQuery({
    queryKey: [
      "parity",
      "workspace-issues",
      workspaceId,
      view?.filters,
      view?.projectId,
      view?.display.orderBy,
      view?.display.direction,
    ],
    queryFn: ({ pageParam }) => viewsApi.tasks(workspaceId, pageParam, view),
    initialPageParam: 1,
    getNextPageParam: (page) => (page.hasMore ? page.page + 1 : undefined),
    enabled: Boolean(workspaceId),
  });
  useCycleFocus(query.refetch, Boolean(workspaceId));
  const items = query.isError ? [] : uniquePageItems(query.data?.pages);
  return (
    <FlatList
      data={items}
      keyExtractor={(item) => item.id}
      contentContainerStyle={{ paddingBottom: 40 }}
      refreshing={refreshing || query.isRefetching}
      onRefresh={() => {
        void query.refetch();
        onRefresh?.();
      }}
      ListHeaderComponent={
        view ? (
          <Txt
            variant="bodySm"
            tone="muted"
            style={{ paddingHorizontal: 20, paddingBottom: 16 }}
          >
            {t("mobile:parity.views.editOnWeb")}
          </Txt>
        ) : undefined
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
          <EmptyState title={t("mobile:parity.views.noIssues")} />
        )
      }
      renderItem={({ item }) => (
        <TaskRow
          title={item.title}
          ticket={ticketId(item.projectSlug, item.number)}
          project={item.projectName}
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
      )}
      ListFooterComponent={
        !query.error && query.hasNextPage ? (
          <View style={{ padding: 20 }}>
            <Button
              kind="secondary"
              label={t("mobile:parity.views.more")}
              loading={query.isFetchingNextPage}
              onPress={() => void query.fetchNextPage()}
            />
          </View>
        ) : undefined
      }
    />
  );
}

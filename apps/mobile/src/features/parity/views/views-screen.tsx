import { useInfiniteQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { FlatList } from "react-native";
import {
  EmptyState,
  ErrorState,
  Loading,
  PageHeader,
  Screen,
} from "@/components/screen";
import { Txt } from "@/components/text";
import { Button, Group, Touch } from "@/components/ui";
import { userMessage } from "@/lib/api/client";
import { useCycleFocus } from "../cycles/queries";
import { usePlanningEnabled } from "../planning/queries";
import { uniquePageItems } from "../planning/unique-page-items";
import { viewsApi } from "./api";
export function ViewsScreen({ workspaceId }: { workspaceId: string }) {
  const { t } = useTranslation(["mobile"]);
  const enabled = usePlanningEnabled("views");
  const query = useInfiniteQuery({
    queryKey: ["parity", "views", workspaceId],
    queryFn: ({ pageParam }) => viewsApi.list(workspaceId, pageParam),
    initialPageParam: 1,
    getNextPageParam: (page) => (page.hasMore ? page.page + 1 : undefined),
    enabled: enabled && Boolean(workspaceId),
  });
  useCycleFocus(query.refetch, enabled && Boolean(workspaceId));
  const items = query.isError ? [] : uniquePageItems(query.data?.pages);
  return (
    <Screen>
      <PageHeader
        title={t("mobile:parity.views.title")}
        description={t("mobile:parity.views.subtitle")}
      />
      {!enabled ? (
        <Txt center>{t("mobile:parity.planning.unavailable")}</Txt>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          refreshing={query.isRefetching}
          onRefresh={() => void query.refetch()}
          contentContainerStyle={{
            padding: 20,
            paddingTop: 0,
            gap: 12,
            paddingBottom: 40,
          }}
          ListHeaderComponent={
            <Button
              kind="secondary"
              label={t("mobile:parity.views.allIssues")}
              onPress={() =>
                router.push({
                  pathname: "/workspace-issues",
                  params: { workspaceId },
                })
              }
            />
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
              <EmptyState title={t("mobile:parity.views.noViews")} />
            )
          }
          renderItem={({ item }) => (
            <Group>
              <Touch
                accessibilityRole="button"
                onPress={() =>
                  router.push({
                    pathname: "/view/[viewId]",
                    params: { workspaceId, viewId: item.id },
                  })
                }
                style={{ padding: 16, gap: 6 }}
              >
                <Txt variant="section">
                  {item.icon ? `${item.icon} ` : ""}
                  {item.name}
                </Txt>
                <Txt variant="meta" tone="muted">
                  {t(
                    item.shared
                      ? "mobile:parity.views.shared"
                      : "mobile:parity.views.personal",
                  )}
                </Txt>
              </Touch>
            </Group>
          )}
          ListFooterComponent={
            !query.error && query.hasNextPage ? (
              <Button
                kind="secondary"
                label={t("mobile:parity.views.more")}
                loading={query.isFetchingNextPage}
                onPress={() => void query.fetchNextPage()}
              />
            ) : undefined
          }
        />
      )}
    </Screen>
  );
}

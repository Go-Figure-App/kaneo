import { uniquePageItems } from "./unique-page-items";
import { useInfiniteQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { FlatList, View } from "react-native";
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
import { formatDate } from "@/lib/format";
import { planningApi } from "./api";
import { PlanningHealth } from "./health";
import { usePlanningLabels } from "./labels";
import { PlanningProgress } from "./progress";
import { usePlanningEnabled, usePlanningPermissions } from "./queries";

export function InitiativeList({ workspaceId }: { workspaceId: string }) {
  const { t } = useTranslation(["mobile"]);
  const labels = usePlanningLabels();
  const enabled = usePlanningEnabled("initiatives");
  const [archived, setArchived] = useState(false);
  const permissions = usePlanningPermissions(workspaceId);
  const query = useInfiniteQuery({
    queryKey: ["parity", "initiatives", workspaceId, archived],
    initialPageParam: 1,
    queryFn: ({ pageParam }) =>
      planningApi.initiatives(workspaceId, pageParam, archived),
    getNextPageParam: (page) => (page.hasMore ? page.page + 1 : undefined),
    enabled,
  });
  const items = query.isError ? [] : uniquePageItems(query.data?.pages);
  return (
    <Screen>
      <PageHeader title={t("mobile:parity.planning.initiatives")} />
      {!enabled ? (
        <Txt center>{t("mobile:parity.planning.unavailable")}</Txt>
      ) : (
        <>
          <View style={{ paddingHorizontal: 20, paddingBottom: 16, gap: 12 }}>
            {permissions.data?.updateProjects && (
              <Button
                label={t("mobile:parity.planning.newInitiative")}
                onPress={() =>
                  router.push({
                    pathname: "/initiative/new",
                    params: { workspaceId },
                  })
                }
              />
            )}
            <Touch
              accessibilityRole="checkbox"
              accessibilityState={{ checked: archived }}
              onPress={() => setArchived(!archived)}
              style={{ minHeight: 44, justifyContent: "center" }}
            >
              <Txt variant="bodySm">
                {archived ? "✓ " : ""}
                {t("mobile:parity.planning.showArchived")}
              </Txt>
            </Touch>
          </View>
          {query.isPending ? (
            <Loading />
          ) : query.isError && !query.data ? (
            <ErrorState
              message={userMessage(query.error)}
              onRetry={query.refetch}
            />
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
              ListEmptyComponent={
                <EmptyState title={t("mobile:parity.planning.noInitiatives")} />
              }
              renderItem={({ item }) => (
                <Group>
                  <Touch
                    accessibilityRole="button"
                    onPress={() =>
                      router.push({
                        pathname: "/initiative/[initiativeId]",
                        params: { initiativeId: item.id },
                      })
                    }
                    style={{ padding: 16, gap: 10 }}
                  >
                    <Txt variant="section">{item.name}</Txt>
                    <View
                      style={{
                        flexDirection: "row",
                        justifyContent: "space-between",
                      }}
                    >
                      <Txt variant="meta" tone="muted">
                        {item.archivedAt
                          ? t("mobile:parity.planning.archived")
                          : labels.status[item.status]}
                      </Txt>
                      <PlanningHealth health={item.health} />
                    </View>
                    <Txt variant="caption" tone="muted">
                      {item.ownerName ?? t("mobile:parity.planning.noOwner")} ·{" "}
                      {item.targetDate
                        ? formatDate(item.targetDate)
                        : t("mobile:parity.planning.noDate")}
                    </Txt>
                    <PlanningProgress progress={item.progress} />
                  </Touch>
                </Group>
              )}
              ListFooterComponent={
                <View style={{ gap: 12 }}>
                  {query.isError && (
                    <ErrorState
                      message={userMessage(query.error)}
                      onRetry={query.refetch}
                    />
                  )}
                  {!query.isError && query.hasNextPage && (
                    <Button
                      label={t("mobile:parity.planning.loadMore")}
                      kind="secondary"
                      loading={query.isFetchingNextPage}
                      onPress={() => void query.fetchNextPage()}
                    />
                  )}
                </View>
              }
            />
          )}
        </>
      )}
    </Screen>
  );
}

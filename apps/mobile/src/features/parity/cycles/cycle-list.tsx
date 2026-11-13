import { useInfiniteQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { useState } from "react";
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
import { Button, Group, Segmented, Touch } from "@/components/ui";
import { userMessage } from "@/lib/api/client";
import { usePlanningEnabled } from "../planning/queries";
import { uniquePageItems } from "../planning/unique-page-items";
import { cyclesApi } from "./api";
import { CycleProgress } from "./progress";
import type { CyclePhase } from "./types";
import { useCycleFocus } from "./queries";

export function CycleList({ workspaceId }: { workspaceId: string }) {
  const { t } = useTranslation(["mobile"]);
  const enabled = usePlanningEnabled("cycles");
  const [phase, setPhase] = useState<CyclePhase>("current");
  const query = useInfiniteQuery({
    queryKey: ["parity", "cycles", workspaceId, phase],
    queryFn: ({ pageParam }) => cyclesApi.list(workspaceId, phase, pageParam),
    initialPageParam: 1,
    getNextPageParam: (page) => (page.hasMore ? page.page + 1 : undefined),
    enabled: enabled && Boolean(workspaceId),
  });
  const items = query.isError ? [] : uniquePageItems(query.data?.pages);
  useCycleFocus(query.refetch, enabled && Boolean(workspaceId));
  const settings = query.data?.pages[0]?.settings;
  return (
    <Screen>
      <PageHeader title={t("mobile:parity.cycles.title")} />
      {!enabled ? (
        <Txt center>{t("mobile:parity.planning.unavailable")}</Txt>
      ) : (
        <>
          <Segmented
            value={phase}
            onChange={setPhase}
            style={{ marginHorizontal: 20, marginBottom: 16 }}
            options={(["current", "upcoming", "past"] as const).map(
              (value) => ({ value, label: t(`mobile:parity.cycles.${value}`) }),
            )}
          />
          {query.isPending ? (
            <Loading />
          ) : query.error ? (
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
                paddingHorizontal: 20,
                gap: 12,
                paddingBottom: 40,
              }}
              ListEmptyComponent={
                <EmptyState
                  title={
                    phase === "current"
                      ? t("mobile:parity.cycles.noCurrentCycle")
                      : t("mobile:parity.cycles.noCycles")
                  }
                  message={
                    settings?.cyclesEnabled
                      ? undefined
                      : t("mobile:parity.cycles.disabled")
                  }
                />
              }
              renderItem={({ item }) => (
                <Group>
                  <Touch
                    accessibilityRole="button"
                    onPress={() =>
                      router.push({
                        pathname: "/cycle/[cycleId]",
                        params: { cycleId: item.id },
                      })
                    }
                    style={{ padding: 16, gap: 12 }}
                  >
                    <Txt variant="section">
                      {item.name ??
                        t("mobile:parity.cycles.number", {
                          number: item.number,
                        })}
                    </Txt>
                    {settings && (
                      <CycleProgress cycle={item} settings={settings} />
                    )}
                  </Touch>
                </Group>
              )}
              ListFooterComponent={
                query.hasNextPage ? (
                  <Button
                    label={t("mobile:parity.cycles.loadMore")}
                    kind="secondary"
                    loading={query.isFetchingNextPage}
                    onPress={() => void query.fetchNextPage()}
                  />
                ) : undefined
              }
            />
          )}
        </>
      )}
    </Screen>
  );
}

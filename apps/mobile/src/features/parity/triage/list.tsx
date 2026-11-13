import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { FlatList, View } from "react-native";
import { ErrorState, Loading } from "@/components/screen";
import { Txt } from "@/components/text";
import { Button } from "@/components/ui";
import { userMessage } from "@/lib/api/client";
import { api } from "@/lib/api/endpoints";
import { qk } from "@/lib/query";
import { triageApi, type TriageDecision, type TriageItem } from "./api";
import { TriageRow } from "./row";
import { TriageDecisionSheet } from "./decision-sheet";

export function TriageList({ workspaceId }: { workspaceId: string }) {
  const { t } = useTranslation(["mobile"]);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<{
    item: TriageItem;
    action: TriageDecision["action"] | "menu";
  } | null>(null);
  const query = useQuery({
    queryKey: ["parity", "triage", workspaceId, page],
    queryFn: () => triageApi.list(workspaceId, page),
    refetchInterval: 30_000,
  });
  const total = query.data?.total;
  const pageSize = query.data?.pageSize;
  useEffect(() => {
    if (total !== undefined && pageSize) {
      const lastPage = Math.max(1, Math.ceil(total / pageSize));
      if (page > lastPage) setPage(lastPage);
    }
  }, [page, total, pageSize]);
  const projects = useQuery({
    queryKey: ["parity", "triage", workspaceId, "projects"],
    queryFn: () => triageApi.projects(workspaceId),
  });
  const permissions = useQuery({
    queryKey: qk.capabilities(workspaceId),
    queryFn: () => api.workspaceCapabilities(workspaceId),
  });
  if (query.isPending) return <Loading />;
  if (query.isError && !query.data)
    return (
      <ErrorState message={userMessage(query.error)} onRetry={query.refetch} />
    );
  return (
    <View style={{ flex: 1 }}>
      {permissions.data?.createTasks && (
        <View style={{ paddingHorizontal: 16, paddingBottom: 12 }}>
          <Button
            label={t("mobile:parity.triage.newItem")}
            disabled={!projects.data?.length}
            onPress={() =>
              router.push({
                pathname: "/task/new",
                params: {
                  workspaceId,
                  projectId: projects.data![0].id,
                  triage: "true",
                },
              })
            }
          />
        </View>
      )}
      <FlatList
        data={query.data?.items ?? []}
        keyExtractor={(item) => item.id}
        refreshing={query.isRefetching}
        onRefresh={() => void query.refetch()}
        ListEmptyComponent={
          <Txt center tone="muted" style={{ padding: 32 }}>
            {t("mobile:inbox.empty.title")}
          </Txt>
        }
        renderItem={({ item }) => (
          <TriageRow
            item={item}
            canUpdate={permissions.data?.updateTasks ?? false}
            onOpen={() =>
              router.push({
                pathname: "/task/[taskId]",
                params: { taskId: item.id },
              })
            }
            onAction={(action) => setSelected({ item, action })}
          />
        )}
        ListFooterComponent={
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              padding: 16,
            }}
          >
            <Button
              size="sm"
              kind="secondary"
              label="‹"
              disabled={page === 1}
              onPress={() => setPage(page - 1)}
            />
            <Txt>
              {page} / {Math.max(1, Math.ceil((query.data?.total ?? 0) / 50))}
            </Txt>
            <Button
              size="sm"
              kind="secondary"
              label="›"
              disabled={page * 50 >= (query.data?.total ?? 0)}
              onPress={() => setPage(page + 1)}
            />
          </View>
        }
      />
      {selected && (
        <TriageDecisionSheet
          key={`${selected.item.id}:${selected.action}`}
          workspaceId={workspaceId}
          item={selected.item}
          action={selected.action}
          canAssign={permissions.data?.assignTasks ?? false}
          onClose={() => setSelected(null)}
        />
      )}
    </View>
  );
}

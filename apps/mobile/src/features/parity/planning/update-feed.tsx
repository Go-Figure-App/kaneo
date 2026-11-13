import { planningListState } from "./list-state";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { View } from "react-native";
import { MarkdownText } from "@/components/markdown";
import { ErrorState, Loading } from "@/components/screen";
import { Txt } from "@/components/text";
import { Button, Group } from "@/components/ui";
import { userMessage } from "@/lib/api/client";
import { currentLocale } from "@/lib/i18n";
import { planningApi } from "./api";
import { PlanningHealth } from "./health";
import type { Health, ParentType } from "./types";
import { UpdateComposer } from "./update-composer";

export function PlanningUpdates({
  kind,
  id,
  health,
  canUpdate,
}: {
  kind: ParentType;
  id: string;
  health: Health;
  canUpdate: boolean;
}) {
  const { t } = useTranslation(["mobile"]);
  const [composing, setComposing] = useState(false);
  const query = useInfiniteQuery({
    queryKey: ["parity", "updates", kind, id],
    initialPageParam: 1,
    queryFn: ({ pageParam }) => planningApi.updates(kind, id, pageParam),
    getNextPageParam: (page) => (page.hasMore ? page.page + 1 : undefined),
  });
  const { items, showEmpty } = planningListState(query);
  return (
    <View style={{ gap: 16 }}>
      <Txt variant="section">{t("mobile:parity.planning.updates")}</Txt>
      {canUpdate && (
        <Button
          label={t("mobile:parity.planning.postUpdate")}
          kind="secondary"
          onPress={() => setComposing(true)}
        />
      )}
      {query.isPending ? (
        <Loading />
      ) : query.isError ? (
        <ErrorState
          message={userMessage(query.error)}
          onRetry={query.refetch}
        />
      ) : showEmpty ? (
        <Txt tone="muted">{t("mobile:parity.planning.noUpdates")}</Txt>
      ) : null}
      {items.map((update) => (
        <Group key={update.id} style={{ padding: 16, gap: 10 }}>
          <PlanningHealth health={update.health} />
          <MarkdownText>{update.body}</MarkdownText>
          <Txt variant="caption" tone="muted">
            {update.authorName ?? t("mobile:parity.planning.deletedUser")} ·{" "}
            {new Date(update.createdAt).toLocaleDateString(currentLocale())}
          </Txt>
        </Group>
      ))}
      {!query.isError && query.hasNextPage && (
        <Button
          label={t("mobile:parity.planning.loadMore")}
          kind="secondary"
          loading={query.isFetchingNextPage}
          onPress={() => void query.fetchNextPage()}
        />
      )}
      {composing && (
        <UpdateComposer
          kind={kind}
          id={id}
          health={health}
          onClose={() => setComposing(false)}
        />
      )}
    </View>
  );
}

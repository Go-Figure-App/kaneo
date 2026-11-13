import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { View } from "react-native";
import {
  EmptyState,
  ErrorState,
  Loading,
  PageHeader,
  Screen,
  Scroll,
} from "@/components/screen";
import { Txt } from "@/components/text";
import { userMessage } from "@/lib/api/client";
import { cyclesApi } from "../cycles/api";
import { useCycleFocus } from "../cycles/queries";
import { usePlanningEnabled } from "../planning/queries";
import { CycleSummary } from "./cycle-summary";

export function InsightsScreen({ workspaceId }: { workspaceId: string }) {
  const { t } = useTranslation(["mobile"]);
  const client = useQueryClient();
  const enabled = usePlanningEnabled("insights");
  const cyclesEnabled = usePlanningEnabled("cycles");
  const query = useQuery({
    queryKey: ["parity", "insight-cycles", workspaceId],
    queryFn: async () => {
      const [current, past] = await Promise.all([
        cyclesApi.list(workspaceId, "current"),
        cyclesApi.list(workspaceId, "past"),
      ]);
      return {
        current: current.items[0],
        past: past.items[0],
        timeZone: current.settings.timeZone,
      };
    },
    enabled: enabled && cyclesEnabled && Boolean(workspaceId),
  });
  useCycleFocus(
    query.refetch,
    enabled && cyclesEnabled && Boolean(workspaceId),
  );
  const data = query.isError ? undefined : query.data;
  return (
    <Screen>
      <PageHeader title={t("mobile:parity.insights.title")} />
      {!enabled ? (
        <Txt center>{t("mobile:parity.planning.unavailable")}</Txt>
      ) : !cyclesEnabled ? (
        <EmptyState
          title={t("mobile:parity.insights.noCycles")}
          message={t("mobile:parity.insights.enableCycles")}
        />
      ) : query.isPending ? (
        <Loading />
      ) : query.error ? (
        <ErrorState
          message={userMessage(query.error)}
          onRetry={query.refetch}
        />
      ) : (
        <Scroll
          refreshing={query.isRefetching}
          onRefresh={() =>
            Promise.all([
              query.refetch(),
              client.invalidateQueries({
                queryKey: ["parity", "insights", workspaceId],
              }),
            ])
          }
        >
          <View style={{ paddingHorizontal: 20, gap: 16, paddingBottom: 40 }}>
            <Txt variant="bodySm" tone="muted">
              {t("mobile:parity.insights.subtitle")}
            </Txt>
            {data?.current && (
              <CycleSummary
                workspaceId={workspaceId}
                cycle={data.current}
                timeZone={data.timeZone}
                title={t("mobile:parity.cycles.current")}
              />
            )}
            {data?.past && (
              <CycleSummary
                workspaceId={workspaceId}
                cycle={data.past}
                timeZone={data.timeZone}
                title={t("mobile:parity.insights.lastCycle")}
              />
            )}
            {!data?.current && !data?.past && (
              <EmptyState
                title={t("mobile:parity.insights.noCycles")}
                message={t("mobile:parity.insights.enableCycles")}
              />
            )}
          </View>
        </Scroll>
      )}
    </Screen>
  );
}

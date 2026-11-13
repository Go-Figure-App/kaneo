import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { View } from "react-native";
import { ErrorState, Loading, PageHeader, Screen } from "@/components/screen";
import { Txt } from "@/components/text";
import { userMessage } from "@/lib/api/client";
import { usePlanningEnabled } from "../planning/queries";
import { cyclesApi } from "./api";
import { CycleBurndown } from "./burndown-chart";
import { CycleProgress } from "./progress";
import { CycleTaskList } from "./task-list";
import { useCycleFocus } from "./use-cycle-focus";

export function CycleDetailScreen({ cycleId }: { cycleId: string }) {
  const { t } = useTranslation(["mobile"]);
  const enabled = usePlanningEnabled("cycles");
  const query = useQuery({
    queryKey: ["parity", "cycle", cycleId],
    queryFn: () => cyclesApi.detail(cycleId),
    enabled: enabled && Boolean(cycleId),
  });
  const cycle = query.isError ? undefined : query.data;
  useCycleFocus(query.refetch, enabled && Boolean(cycleId));
  return (
    <Screen>
      <PageHeader
        title={
          cycle?.name ??
          (cycle
            ? t("mobile:parity.cycles.number", { number: cycle.number })
            : t("mobile:parity.cycles.title"))
        }
      />
      {!enabled ? (
        <Txt center>{t("mobile:parity.planning.unavailable")}</Txt>
      ) : query.isPending ? (
        <Loading />
      ) : query.error ? (
        <ErrorState
          message={userMessage(query.error)}
          onRetry={query.refetch}
        />
      ) : (
        cycle && (
          <CycleTaskList
            key={cycle.id}
            cycleId={cycle.id}
            workspaceId={cycle.workspaceId}
            settings={cycle.settings}
            refreshing={query.isRefetching}
            onRefresh={() => void query.refetch()}
            header={
              <View style={{ gap: 20 }}>
                <Txt variant="meta" tone="muted">
                  {t(`mobile:parity.cycles.${cycle.phase}`)}
                </Txt>
                <CycleProgress cycle={cycle} settings={cycle.settings} />
                <CycleBurndown cycle={cycle} />
              </View>
            }
          />
        )
      )}
    </Screen>
  );
}

import { useTranslation } from "react-i18next";
import { ErrorState, Loading } from "@/components/screen";
import { Txt } from "@/components/text";
import { userMessage } from "@/lib/api/client";
import { useMe } from "@/lib/hooks";
import { useCurrentCycle } from "./queries";
import { CycleTaskList } from "./task-list";

export function MyCycleTasks({ workspaceId }: { workspaceId: string }) {
  const { t } = useTranslation(["mobile"]);
  const query = useCurrentCycle(workspaceId);
  const me = useMe();
  if (!query.enabled) return null;
  if (query.isPending || me.isPending) return <Loading />;
  if (query.error || me.error)
    return (
      <ErrorState
        message={userMessage(query.error ?? me.error)}
        onRetry={() => {
          void query.refetch();
          void me.refetch();
        }}
      />
    );
  if (!query.cycle || !query.data?.settings.cyclesEnabled)
    return (
      <Txt center tone="muted" style={{ padding: 20 }}>
        {t("mobile:parity.cycles.noCurrentCycle")}
      </Txt>
    );
  if (!me.data?.id) return null;
  return (
    <CycleTaskList
      key={query.cycle.id}
      cycleId={query.cycle.id}
      workspaceId={workspaceId}
      settings={query.data.settings}
      assigneeId={me.data.id}
      refreshing={query.isRefetching}
      onRefresh={() => void query.refetch()}
    />
  );
}

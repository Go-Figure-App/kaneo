import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import {
  ErrorState,
  Loading,
  PageHeader,
  Screen,
  Scroll,
} from "@/components/screen";
import { Txt } from "@/components/text";
import { userMessage } from "@/lib/api/client";
import { planningApi } from "./api";
import { InitiativeForm } from "./initiative-form";
import { usePlanningEnabled, usePlanningPermissions } from "./queries";

export function InitiativeEditor({
  workspaceId,
  initiativeId,
}: {
  workspaceId?: string;
  initiativeId?: string;
}) {
  const { t } = useTranslation(["mobile"]);
  const enabled = usePlanningEnabled("initiatives");
  const query = useQuery({
    queryKey: ["parity", "initiative", initiativeId],
    queryFn: () => planningApi.initiative(initiativeId!),
    enabled: enabled && Boolean(initiativeId),
  });
  const actualWorkspaceId = initiativeId
    ? query.data?.workspaceId
    : workspaceId;
  const permissions = usePlanningPermissions(actualWorkspaceId);
  return (
    <Screen>
      <Scroll>
        <PageHeader
          title={t(
            initiativeId
              ? "mobile:parity.planning.editProperties"
              : "mobile:parity.planning.newInitiative",
          )}
        />
        {!enabled ? (
          <Txt center>{t("mobile:parity.planning.unavailable")}</Txt>
        ) : initiativeId && query.isError ? (
          <ErrorState
            message={userMessage(query.error)}
            onRetry={query.refetch}
          />
        ) : (initiativeId && query.isPending) || permissions.isPending ? (
          <Loading />
        ) : permissions.isError ? (
          <ErrorState
            message={userMessage(permissions.error)}
            onRetry={permissions.refetch}
          />
        ) : !permissions.data?.updateProjects || query.data?.archivedAt ? (
          <Txt center>{t("mobile:parity.planning.noAccess")}</Txt>
        ) : (
          actualWorkspaceId && (
            <InitiativeForm
              key={initiativeId ?? actualWorkspaceId}
              workspaceId={actualWorkspaceId}
              initiative={query.data}
            />
          )
        )}
      </Scroll>
    </Screen>
  );
}

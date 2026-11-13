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
import { ProjectPlanForm } from "./project-form";
import { usePlanningEnabled, usePlanningPermissions } from "./queries";

export function ProjectPlanEditor({ projectId }: { projectId: string }) {
  const { t } = useTranslation(["mobile"]);
  const enabled = usePlanningEnabled();
  const query = useQuery({
    queryKey: ["parity", "project", projectId],
    queryFn: () => planningApi.project(projectId),
    enabled,
  });
  const permissions = usePlanningPermissions(query.data?.workspaceId);
  return (
    <Screen>
      <Scroll>
        <PageHeader
          title={t("mobile:parity.planning.editProperties")}
          description={query.data?.name}
        />
        {!enabled ? (
          <Txt center>{t("mobile:parity.planning.unavailable")}</Txt>
        ) : query.isError ? (
          <ErrorState
            message={userMessage(query.error)}
            onRetry={query.refetch}
          />
        ) : query.isPending || permissions.isPending ? (
          <Loading />
        ) : permissions.isError ? (
          <ErrorState
            message={userMessage(permissions.error)}
            onRetry={permissions.refetch}
          />
        ) : !permissions.data?.updateProjects ? (
          <Txt center>{t("mobile:parity.planning.noAccess")}</Txt>
        ) : (
          query.data && <ProjectPlanForm key={projectId} project={query.data} />
        )}
      </Scroll>
    </Screen>
  );
}

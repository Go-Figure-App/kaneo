import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { View } from "react-native";
import { MarkdownText } from "@/components/markdown";
import {
  ErrorState,
  Loading,
  PageHeader,
  Screen,
  Scroll,
} from "@/components/screen";
import { Txt } from "@/components/text";
import { Button, Group, Touch } from "@/components/ui";
import { userMessage } from "@/lib/api/client";
import { formatDate } from "@/lib/format";
import { useAction } from "@/lib/query";
import { planningApi } from "./api";
import { PlanningHealth } from "./health";
import { usePlanningLabels } from "./labels";
import { PlanningProgress } from "./progress";
import { PlanningProperty } from "./property-row";
import { usePlanningEnabled, usePlanningPermissions } from "./queries";
import { PlanningUpdates } from "./update-feed";

export function InitiativeDetailScreen({
  initiativeId,
}: {
  initiativeId: string;
}) {
  const { t } = useTranslation(["mobile"]);
  const labels = usePlanningLabels();
  const enabled = usePlanningEnabled("initiatives");
  const { run, busy } = useAction("parity");
  const query = useQuery({
    queryKey: ["parity", "initiative", initiativeId],
    queryFn: () => planningApi.initiative(initiativeId),
    enabled,
  });
  const initiative = query.isError ? undefined : query.data;
  const permissions = usePlanningPermissions(initiative?.workspaceId);
  return (
    <Screen>
      <Scroll
        refreshing={query.isRefetching}
        onRefresh={() => {
          if (enabled) void query.refetch();
        }}
      >
        <PageHeader
          title={initiative?.name ?? t("mobile:parity.planning.initiative")}
        />
        {!enabled ? (
          <Txt center>{t("mobile:parity.planning.unavailable")}</Txt>
        ) : query.isPending ? (
          <Loading />
        ) : query.isError ? (
          <ErrorState
            message={userMessage(query.error)}
            onRetry={query.refetch}
          />
        ) : (
          initiative && (
            <View style={{ paddingHorizontal: 20, gap: 24 }}>
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                }}
              >
                <Txt variant="bodySm">
                  {initiative.archivedAt
                    ? t("mobile:parity.planning.archived")
                    : labels.status[initiative.status]}
                </Txt>
                <PlanningHealth health={initiative.health} />
              </View>
              {initiative.description && (
                <MarkdownText>{initiative.description}</MarkdownText>
              )}
              <PlanningProgress progress={initiative.progress} />
              <Group style={{ padding: 16, gap: 8 }}>
                <PlanningProperty
                  label={t("mobile:parity.planning.owner")}
                  value={
                    initiative.ownerName ?? t("mobile:parity.planning.noOwner")
                  }
                />
                <PlanningProperty
                  label={t("mobile:parity.planning.targetDate")}
                  value={
                    initiative.targetDate
                      ? formatDate(initiative.targetDate)
                      : t("mobile:parity.planning.noDate")
                  }
                />
                {!initiative.archivedAt && permissions.data?.updateProjects && (
                  <Button
                    label={t("mobile:parity.planning.editProperties")}
                    kind="secondary"
                    onPress={() =>
                      router.push({
                        pathname: "/initiative/[initiativeId]/edit",
                        params: { initiativeId },
                      })
                    }
                  />
                )}
                {permissions.data?.manageSettings &&
                  permissions.data.updateProjects && (
                    <Button
                      label={t(
                        initiative.archivedAt
                          ? "mobile:parity.planning.restore"
                          : "mobile:parity.planning.archive",
                      )}
                      kind="secondary"
                      loading={busy}
                      onPress={() =>
                        void run(() =>
                          planningApi.updateInitiative(initiativeId, {
                            archived: !initiative.archivedAt,
                          }),
                        )
                      }
                    />
                  )}
              </Group>
              <View style={{ gap: 12 }}>
                <Txt variant="section">
                  {t("mobile:parity.planning.linkedProjects")}
                </Txt>
                {!initiative.projects.length && (
                  <Txt tone="muted">
                    {t("mobile:parity.planning.noProjects")}
                  </Txt>
                )}
                {initiative.projects.map((project) => (
                  <Group key={project.id}>
                    <Touch
                      accessibilityRole="button"
                      onPress={() =>
                        router.push({
                          pathname: "/project/[projectId]/overview",
                          params: { projectId: project.id },
                        })
                      }
                      style={{ padding: 16, gap: 10 }}
                    >
                      <Txt variant="body" weight="medium">
                        {project.name}
                      </Txt>
                      <View
                        style={{
                          flexDirection: "row",
                          justifyContent: "space-between",
                        }}
                      >
                        <Txt variant="meta">
                          {labels.status[project.status]}
                        </Txt>
                        <PlanningHealth health={project.health} />
                      </View>
                      <PlanningProgress progress={project.progress} />
                    </Touch>
                  </Group>
                ))}
              </View>
              <PlanningUpdates
                kind="initiative"
                id={initiativeId}
                health={initiative.health}
                canUpdate={
                  !initiative.archivedAt &&
                  Boolean(permissions.data?.updateProjects)
                }
              />
            </View>
          )
        )}
      </Scroll>
    </Screen>
  );
}

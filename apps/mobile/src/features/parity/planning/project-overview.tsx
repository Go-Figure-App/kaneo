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
import { Button, Group } from "@/components/ui";
import { userMessage } from "@/lib/api/client";
import { formatDate } from "@/lib/format";
import { planningApi } from "./api";
import { PlanningHealth } from "./health";
import { usePlanningLabels } from "./labels";
import { PlanningProgress } from "./progress";
import { PlanningProperty } from "./property-row";
import { usePlanningEnabled, usePlanningPermissions } from "./queries";
import { PlanningUpdates } from "./update-feed";

export function ProjectOverview({ projectId }: { projectId: string }) {
  const { t } = useTranslation(["mobile"]);
  const labels = usePlanningLabels();
  const enabled = usePlanningEnabled();
  const query = useQuery({
    queryKey: ["parity", "project", projectId],
    queryFn: () => planningApi.project(projectId),
    enabled,
  });
  const permissions = usePlanningPermissions(query.data?.workspaceId);
  const project = query.data;
  return (
    <Screen>
      <Scroll
        refreshing={query.isRefetching}
        onRefresh={() => {
          if (enabled) void query.refetch();
        }}
      >
        <PageHeader
          title={project?.name ?? t("mobile:parity.planning.overview")}
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
          project && (
            <View style={{ paddingHorizontal: 20, gap: 24 }}>
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                }}
              >
                <Txt variant="bodySm">{labels.status[project.status]}</Txt>
                <PlanningHealth health={project.health} />
              </View>
              <Button
                label={t("mobile:parity.planning.board")}
                onPress={() =>
                  router.push({
                    pathname: "/board/[projectId]",
                    params: { projectId, workspaceId: project.workspaceId },
                  })
                }
              />
              {project.description && (
                <MarkdownText>{project.description}</MarkdownText>
              )}
              <PlanningProgress progress={project.progress} />
              <Group style={{ padding: 16 }}>
                <PlanningProperty
                  label={t("mobile:parity.planning.lead")}
                  value={project.leadName ?? t("mobile:parity.planning.noLead")}
                />
                <PlanningProperty
                  label={t("mobile:parity.planning.startDate")}
                  value={
                    project.startDate
                      ? formatDate(project.startDate)
                      : t("mobile:parity.planning.noDate")
                  }
                />
                <PlanningProperty
                  label={t("mobile:parity.planning.targetDate")}
                  value={
                    project.targetDate
                      ? formatDate(project.targetDate)
                      : t("mobile:parity.planning.noDate")
                  }
                />
                <PlanningProperty
                  label={t("mobile:parity.planning.priority")}
                  value={labels.priority[project.priority]}
                />
                {permissions.data?.updateProjects && (
                  <Button
                    label={t("mobile:parity.planning.editProperties")}
                    kind="secondary"
                    onPress={() =>
                      router.push({
                        pathname: "/project/[projectId]/plan",
                        params: { projectId },
                      })
                    }
                  />
                )}
              </Group>
              <View style={{ gap: 12 }}>
                <Txt variant="section">
                  {t("mobile:parity.planning.milestones")}
                </Txt>
                {!project.milestones.length && (
                  <Txt tone="muted">
                    {t("mobile:parity.planning.noMilestones")}
                  </Txt>
                )}
                {project.milestones.map((milestone) => (
                  <Group key={milestone.id} style={{ padding: 16, gap: 8 }}>
                    <Txt variant="body" weight="medium">
                      {milestone.name}
                    </Txt>
                    {milestone.targetDate && (
                      <Txt variant="caption" tone="muted">
                        {formatDate(milestone.targetDate)}
                      </Txt>
                    )}
                    {milestone.description && (
                      <MarkdownText>{milestone.description}</MarkdownText>
                    )}
                    <PlanningProgress progress={milestone.progress} />
                  </Group>
                ))}
              </View>
              <PlanningUpdates
                kind="project"
                id={projectId}
                health={project.health}
                canUpdate={permissions.data?.updateProjects ?? false}
              />
            </View>
          )
        )}
      </Scroll>
    </Screen>
  );
}

import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { View } from "react-native";
import { Txt } from "@/components/text";
import { Group, Touch } from "@/components/ui";
import { formatDate } from "@/lib/format";
import { PlanningHealth } from "../planning/health";
import { PlanningProgress } from "../planning/progress";
import type { RoadmapProject } from "./api";
import { nextMilestone } from "./grouping";

export function RoadmapProjectRow({ project }: { project: RoadmapProject }) {
  const { t } = useTranslation(["mobile"]);
  const next = nextMilestone(project);
  const date = (value: string | null) =>
    value
      ? formatDate(`${value}T12:00:00`)
      : t("mobile:parity.planning.noDate");
  return (
    <View style={{ marginBottom: 12 }}>
      <Group>
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
          <Txt variant="body" weight="semibold">
            {project.name}
          </Txt>
          <PlanningHealth health={project.health} />
          <Txt variant="bodySm" tone="muted">
            {date(project.startDate)} – {date(project.targetDate)}
          </Txt>
          {(!project.startDate || !project.targetDate) && (
            <Txt variant="meta">{t("mobile:parity.roadmap.unscheduled")}</Txt>
          )}
          {project.leadName && (
            <Txt variant="bodySm" tone="muted">
              {project.leadName}
            </Txt>
          )}
          <PlanningProgress progress={project.progress} />
          {next ? (
            <View style={{ gap: 3 }}>
              <Txt variant="bodySm">
                {t("mobile:parity.roadmap.nextMilestone", { name: next.name })}
              </Txt>
              <Txt variant="meta" tone="muted">
                {date(next.targetDate)}
              </Txt>
            </View>
          ) : (
            <Txt variant="meta" tone="muted">
              {t("mobile:parity.roadmap.noMilestone")}
            </Txt>
          )}
        </Touch>
      </Group>
    </View>
  );
}

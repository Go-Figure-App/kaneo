import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { SectionList, View } from "react-native";
import {
  EmptyState,
  ErrorState,
  Loading,
  PageHeader,
  Screen,
} from "@/components/screen";
import { Txt } from "@/components/text";
import { userMessage } from "@/lib/api/client";
import { useColors } from "@/theme";
import { isAccessError } from "../foundation/access-error";
import { usePlanningEnabled } from "../planning/queries";
import { getRoadmap } from "./api";
import { roadmapSections } from "./grouping";
import { RoadmapProjectRow } from "./project-row";

export function RoadmapScreen({ workspaceId }: { workspaceId: string }) {
  const { t } = useTranslation(["mobile"]);
  const c = useColors();
  const enabled = usePlanningEnabled("roadmap");
  const query = useQuery({
    queryKey: ["parity", "roadmap", workspaceId],
    queryFn: () => getRoadmap(workspaceId),
    enabled,
  });
  const data = isAccessError(query.error) ? undefined : query.data;
  return (
    <Screen>
      <PageHeader
        title={t("mobile:parity.roadmap.title")}
        description={t("mobile:parity.roadmap.readOnly")}
      />
      {!enabled ? (
        <Txt center>{t("mobile:parity.planning.unavailable")}</Txt>
      ) : query.isPending ? (
        <Loading />
      ) : !data && query.error ? (
        <ErrorState
          message={userMessage(query.error)}
          onRetry={query.refetch}
        />
      ) : (
        <SectionList
          sections={roadmapSections(
            data ?? { projects: [], initiatives: [] },
            t("mobile:parity.roadmap.noInitiative"),
          )}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
          refreshing={query.isRefetching}
          onRefresh={() => void query.refetch()}
          stickySectionHeadersEnabled={false}
          ListHeaderComponent={
            query.error ? (
              <ErrorState
                message={userMessage(query.error)}
                onRetry={query.refetch}
              />
            ) : undefined
          }
          ListEmptyComponent={
            query.isSuccess ? (
              <EmptyState title={t("mobile:parity.roadmap.noProjects")} />
            ) : undefined
          }
          renderSectionHeader={({ section }) => (
            <View style={{ paddingVertical: 12, backgroundColor: c.ground }}>
              <Txt variant="section" accessibilityRole="header">
                {section.title}
              </Txt>
            </View>
          )}
          renderItem={({ item }) => <RoadmapProjectRow project={item} />}
        />
      )}
    </Screen>
  );
}

import { router } from "expo-router";
import { Activity, Flag, GanttChart } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { View } from "react-native";
import { PageHeader, Scroll } from "@/components/screen";
import { Txt } from "@/components/text";
import { Group, Touch } from "@/components/ui";
import { useColors } from "@/theme";
import { usePlanningEnabled } from "./queries";

export function MoreTab({
  workspaceId,
  onActivity,
}: {
  workspaceId: string;
  onActivity: () => void;
}) {
  const { t } = useTranslation(["mobile"]);
  const c = useColors();
  const initiatives = usePlanningEnabled("initiatives");
  const roadmap = usePlanningEnabled("roadmap");
  return (
    <Scroll>
      <PageHeader title={t("mobile:parity.planning.more")} back={false} />
      <View style={{ paddingHorizontal: 20 }}>
        <Group>
          {roadmap && (
            <Touch
              accessibilityRole="button"
              onPress={() =>
                router.push({ pathname: "/roadmap", params: { workspaceId } })
              }
              style={{
                padding: 18,
                flexDirection: "row",
                alignItems: "center",
                gap: 12,
              }}
            >
              <GanttChart size={20} color={c.ink2} />
              <Txt>{t("mobile:parity.roadmap.title")}</Txt>
            </Touch>
          )}
          <Touch
            accessibilityRole="button"
            onPress={onActivity}
            style={{
              padding: 18,
              flexDirection: "row",
              alignItems: "center",
              gap: 12,
            }}
          >
            <Activity size={20} color={c.ink2} />
            <Txt>{t("mobile:nav.activity")}</Txt>
          </Touch>
          {initiatives && (
            <Touch
              accessibilityRole="button"
              onPress={() =>
                router.push({
                  pathname: "/initiatives",
                  params: { workspaceId },
                })
              }
              style={{
                padding: 18,
                flexDirection: "row",
                alignItems: "center",
                gap: 12,
              }}
            >
              <Flag size={20} color={c.ink2} />
              <Txt>{t("mobile:parity.planning.initiatives")}</Txt>
            </Touch>
          )}
        </Group>
      </View>
    </Scroll>
  );
}

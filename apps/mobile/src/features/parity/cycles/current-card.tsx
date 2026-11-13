import { router } from "expo-router";
import { CircleDashed, ChevronRight } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { View } from "react-native";
import { ErrorState } from "@/components/screen";
import { Txt } from "@/components/text";
import { Group, Touch } from "@/components/ui";
import { userMessage } from "@/lib/api/client";
import { inset, useColors } from "@/theme";
import { CycleProgress } from "./progress";
import { useCurrentCycle } from "./queries";

export function CurrentCycleCard({ workspaceId }: { workspaceId: string }) {
  const { t } = useTranslation(["mobile"]);
  const c = useColors();
  const query = useCurrentCycle(workspaceId);
  if (!query.enabled) return null;
  if (query.error)
    return (
      <ErrorState message={userMessage(query.error)} onRetry={query.refetch} />
    );
  const cycle = query.cycle;
  if (!cycle || !query.data?.settings.cyclesEnabled) return null;
  return (
    <View style={{ paddingHorizontal: inset, paddingBottom: 24 }}>
      <Group>
        <Touch
          accessibilityRole="button"
          onPress={() =>
            router.push({
              pathname: "/cycle/[cycleId]",
              params: { cycleId: cycle.id },
            })
          }
          style={{ padding: 16, gap: 14 }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <CircleDashed size={18} color={c.ink2} />
            <Txt variant="section" style={{ flex: 1 }}>
              {t("mobile:parity.cycles.currentCycle")}
            </Txt>
            <ChevronRight size={16} color={c.muted} />
          </View>
          <Txt variant="body" weight="medium">
            {cycle.name ??
              t("mobile:parity.cycles.number", { number: cycle.number })}
          </Txt>
          <CycleProgress cycle={cycle} settings={query.data.settings} />
        </Touch>
      </Group>
    </View>
  );
}

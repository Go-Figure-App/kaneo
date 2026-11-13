import { useTranslation } from "react-i18next";
import { View } from "react-native";
import { Txt } from "@/components/text";
import { ProgressBar } from "@/components/ui";
import type { Progress } from "./types";

export function PlanningProgress({ progress }: { progress: Progress }) {
  const { t } = useTranslation(["mobile"]);
  const percent = progress.pointsPercent ?? progress.percent;
  return (
    <View style={{ gap: 8 }}>
      <View
        accessibilityRole="progressbar"
        accessibilityLabel={t("mobile:parity.planning.progress")}
        accessibilityValue={{ min: 0, max: 100, now: percent }}
        style={{ flexDirection: "row" }}
      >
        <ProgressBar value={percent} />
      </View>
      <Txt variant="meta" tone="muted">
        {t("mobile:parity.planning.completed", progress)}
      </Txt>
      {progress.totalPoints !== null && (
        <Txt variant="caption" tone="muted">
          {t("mobile:parity.planning.points", {
            completed: progress.completedPoints,
            total: progress.totalPoints,
          })}
        </Txt>
      )}
    </View>
  );
}

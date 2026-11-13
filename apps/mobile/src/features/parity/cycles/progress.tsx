import { useTranslation } from "react-i18next";
import { View } from "react-native";
import { Txt } from "@/components/text";
import { ProgressBar } from "@/components/ui";
import { currentLocale } from "@/lib/i18n";
import { completion, daysLeft } from "./chart";
import type { Cycle, CycleSettings } from "./types";

export function CycleProgress({
  cycle,
  settings,
}: {
  cycle: Cycle;
  settings: CycleSettings;
}) {
  const { t } = useTranslation(["mobile"]);
  const totals = cycle.summary ?? cycle.progress;
  const percent = completion(totals, settings.estimateScale !== "none");
  const date = new Intl.DateTimeFormat(currentLocale(), {
    dateStyle: "medium",
    timeZone: settings.timeZone,
  });
  const number = new Intl.NumberFormat(currentLocale());
  return (
    <View style={{ gap: 10 }}>
      <Txt variant="caption" tone="muted">
        {date.format(new Date(cycle.startsAt))} –{" "}
        {date.format(new Date(+new Date(cycle.endsAt) - 1))}
      </Txt>
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <Txt variant="meta" weight="medium">
          {t("mobile:parity.cycles.completion", {
            percent: number.format(percent),
          })}
        </Txt>
        <Txt variant="meta" tone="muted">
          {t("mobile:parity.cycles.progress", {
            completed: number.format(totals.completedCount),
            total: number.format(totals.scopeCount),
          })}
        </Txt>
      </View>
      <View
        accessibilityRole="progressbar"
        accessibilityLabel={t("mobile:parity.cycles.completed")}
        accessibilityValue={{ min: 0, max: 100, now: percent }}
        style={{ flexDirection: "row" }}
      >
        <ProgressBar value={percent} />
      </View>
      {settings.estimateScale !== "none" && (
        <Txt variant="caption" tone="muted">
          {t("mobile:parity.cycles.totalPoints", {
            points: number.format(totals.scopePoints),
          })}
        </Txt>
      )}
      {cycle.phase === "current" && (
        <Txt variant="caption" tone="muted">
          {t("mobile:parity.cycles.daysLeft", {
            count: daysLeft(cycle.endsAt, settings.timeZone),
          })}
        </Txt>
      )}
      {cycle.summary && (
        <Txt variant="caption" tone="muted">
          {t("mobile:parity.cycles.rolledOver")}:{" "}
          {new Intl.NumberFormat(currentLocale()).format(
            cycle.summary.rolledOverCount,
          )}
        </Txt>
      )}
    </View>
  );
}

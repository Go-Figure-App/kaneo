import { useTranslation } from "react-i18next";
import Svg, { Line, Rect } from "react-native-svg";
import { currentLocale } from "@/lib/i18n";
import { useColors } from "@/theme";
import { formatCalendarDay } from "../cycles/chart";
import type { InsightReport } from "./api";
import { throughputBars } from "./summary";

export function ThroughputChart({ report }: { report: InsightReport }) {
  const { t } = useTranslation(["mobile"]);
  const c = useColors();
  const bars = throughputBars(report);
  const number = new Intl.NumberFormat(currentLocale());
  return (
    <Svg
      viewBox="0 0 300 68"
      width="100%"
      height={68}
      accessibilityRole="image"
      accessibilityLabel={`${t("mobile:parity.insights.weekly")}. ${bars.map((bar) => `${formatCalendarDay(bar.day, currentLocale())}: ${number.format(bar.value)}`).join(". ")}`}
    >
      <Line x1={8} x2={292} y1={60} y2={60} stroke={c.hairline} />
      {bars.map((bar) => (
        <Rect
          key={bar.day}
          x={bar.x}
          y={60 - bar.height}
          width={bar.width}
          height={bar.height}
          rx={3}
          fill={c.primary}
        />
      ))}
    </Svg>
  );
}

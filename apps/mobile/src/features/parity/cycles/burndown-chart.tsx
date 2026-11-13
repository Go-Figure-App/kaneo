import { useState } from "react";
import { useTranslation } from "react-i18next";
import { View } from "react-native";
import Svg, { Circle, Line, Polyline, Text as SvgText } from "react-native-svg";
import { Txt } from "@/components/text";
import { Button, Group } from "@/components/ui";
import { currentLocale } from "@/lib/i18n";
import { useColors } from "@/theme";
import { burndown } from "./chart";
import type { CycleDetail } from "./types";

export function CycleBurndown({ cycle }: { cycle: CycleDetail }) {
  const { t } = useTranslation(["mobile"]);
  const c = useColors();
  const [history, setHistory] = useState(false);
  const chart = burndown(cycle);
  const x = (value: number) => 32 + value * 276;
  const y = (value: number) => 145 - (value / chart.maximum) * 120;
  const number = (value: number) =>
    new Intl.NumberFormat(currentLocale(), { maximumFractionDigits: 1 }).format(
      value,
    );
  return (
    <Group style={{ padding: 16, gap: 10 }}>
      <Txt variant="section">{t("mobile:parity.cycles.burndown")}</Txt>
      <Txt variant="caption" tone="muted">
        {cycle.settings.estimateScale === "none"
          ? t("mobile:parity.cycles.tasksRemaining")
          : t("mobile:parity.cycles.pointsRemaining")}
      </Txt>
      {!cycle.historyAvailable ? (
        <Txt variant="bodySm" tone="muted">
          {t("mobile:parity.cycles.historyUnavailable")}
        </Txt>
      ) : !chart.observed.length ? (
        <Txt variant="bodySm" tone="muted">
          {t("mobile:parity.cycles.historyEmpty")}
        </Txt>
      ) : (
        <>
          <Svg
            viewBox="0 0 330 172"
            width="100%"
            height={172}
            accessibilityRole="image"
            accessibilityLabel={`${t("mobile:parity.cycles.burndown")}, ${t("mobile:parity.cycles.remaining")}: ${number(chart.observed.at(-1)?.remaining ?? 0)}`}
          >
            {[0, 0.5, 1].map((ratio) => (
              <Line
                key={ratio}
                x1={32}
                x2={308}
                y1={y(chart.maximum * ratio)}
                y2={y(chart.maximum * ratio)}
                stroke={c.hairline}
              />
            ))}
            <SvgText
              x={25}
              y={y(chart.maximum) + 3}
              textAnchor="end"
              fontSize={10}
              fill={c.muted}
            >
              {number(chart.maximum)}
            </SvgText>
            <SvgText
              x={25}
              y={y(0) + 3}
              textAnchor="end"
              fontSize={10}
              fill={c.muted}
            >
              0
            </SvgText>
            <Line
              x1={x(0)}
              x2={x(1)}
              y1={y(chart.initial)}
              y2={y(0)}
              stroke={c.faint}
              strokeDasharray="4 4"
            />
            <Polyline
              points={chart.observed
                .map((row) => `${x(row.x)},${y(row.remaining)}`)
                .join(" ")}
              fill="none"
              stroke={c.primary}
              strokeWidth={2}
              strokeLinejoin="round"
            />
            {chart.observed.map((row) => (
              <Circle
                key={row.day}
                cx={x(row.x)}
                cy={y(row.remaining)}
                r={3}
                fill={c.primary}
              />
            ))}
            <SvgText x={32} y={166} fontSize={9} fill={c.muted}>
              {chart.startDay}
            </SvgText>
            <SvgText
              x={308}
              y={166}
              textAnchor="end"
              fontSize={9}
              fill={c.muted}
            >
              {chart.endDay}
            </SvgText>
          </Svg>
          <Button
            label={t("mobile:parity.cycles.dailyHistory")}
            kind="ghost"
            size="sm"
            onPress={() => setHistory(!history)}
          />
          {history &&
            chart.observed.map((row) => (
              <View
                key={row.day}
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                }}
              >
                <Txt variant="caption">{row.day}</Txt>
                <Txt variant="caption" tone="muted">
                  {t("mobile:parity.cycles.remaining")}: {number(row.remaining)}{" "}
                  / {number(row.scope)}
                </Txt>
              </View>
            ))}
        </>
      )}
    </Group>
  );
}

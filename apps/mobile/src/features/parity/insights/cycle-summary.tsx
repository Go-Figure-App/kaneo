import { useQuery } from "@tanstack/react-query";
import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { View } from "react-native";
import { ErrorState, Loading } from "@/components/screen";
import { Txt } from "@/components/text";
import { Group } from "@/components/ui";
import { userMessage } from "@/lib/api/client";
import { currentLocale } from "@/lib/i18n";
import { useCycleFocus } from "../cycles/queries";
import type { Cycle } from "../cycles/types";
import { insightsApi } from "./api";
import { insightValue } from "./summary";
import { ThroughputChart } from "./throughput-chart";

export function CycleSummary({
  workspaceId,
  cycle,
  timeZone,
  title,
}: {
  workspaceId: string;
  cycle: Cycle;
  timeZone: string;
  title: string;
}) {
  const { t } = useTranslation(["mobile"]);
  const throughput = useQuery({
    queryKey: ["parity", "insights", workspaceId, cycle.id, "throughput"],
    queryFn: () => insightsApi.report(workspaceId, cycle.id, "throughput"),
    staleTime: 60_000,
  });
  const velocity = useQuery({
    queryKey: ["parity", "insights", workspaceId, cycle.id, "velocity"],
    queryFn: () => insightsApi.report(workspaceId, cycle.id, "velocity"),
    staleTime: 60_000,
  });
  const duration = useQuery({
    queryKey: ["parity", "insights", workspaceId, cycle.id, "cycle-time"],
    queryFn: () => insightsApi.report(workspaceId, cycle.id, "cycle-time"),
    staleTime: 60_000,
  });
  const { refetch: refreshThroughput } = throughput;
  const { refetch: refreshVelocity } = velocity;
  const { refetch: refreshDuration } = duration;
  const refresh = useCallback(
    () =>
      Promise.all([refreshThroughput(), refreshVelocity(), refreshDuration()]),
    [refreshThroughput, refreshVelocity, refreshDuration],
  );
  useCycleFocus(refresh);
  const error = throughput.error ?? velocity.error ?? duration.error;
  const number = (value: number | null) =>
    value === null
      ? t("mobile:parity.insights.noHistory")
      : new Intl.NumberFormat(currentLocale(), {
          maximumFractionDigits: 2,
        }).format(value);
  const date = (value: Date) =>
    new Intl.DateTimeFormat(currentLocale(), {
      dateStyle: "medium",
      timeZone,
    }).format(value);
  const points = velocity.data?.estimates ?? false;
  const average = insightValue(velocity.data, "average", points);
  const metrics = [
    {
      title: t("mobile:parity.insights.velocity"),
      value: insightValue(velocity.data, "completed", points),
      unit: t(
        points
          ? "mobile:parity.insights.points"
          : "mobile:parity.insights.issues",
      ),
    },
    {
      title: t("mobile:parity.insights.throughput"),
      value: insightValue(throughput.data, "total"),
      unit: t("mobile:parity.insights.issues"),
    },
    {
      title: t("mobile:parity.insights.cycleTime"),
      value: insightValue(duration.data, "median"),
      unit: t("mobile:parity.insights.days"),
    },
  ];
  return (
    <Group style={{ padding: 18, gap: 14 }}>
      <Txt variant="caption" tone="muted">
        {title}
      </Txt>
      <Txt variant="section">
        {cycle.name ??
          t("mobile:parity.cycles.number", { number: cycle.number })}
      </Txt>
      <Txt variant="caption" tone="muted">
        {date(new Date(cycle.startsAt))} –{" "}
        {date(new Date(+new Date(cycle.endsAt) - 1))}
      </Txt>
      {throughput.isPending || velocity.isPending || duration.isPending ? (
        <Loading />
      ) : error ? (
        <ErrorState message={userMessage(error)} onRetry={refresh} />
      ) : (
        <>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 18 }}>
            {metrics.map((metric) => (
              <View
                key={metric.title}
                style={{ minWidth: 100, flexGrow: 1, gap: 4 }}
              >
                <Txt variant="caption" tone="muted">
                  {metric.title}
                </Txt>
                <Txt variant="section">{number(metric.value)}</Txt>
                {metric.value !== null && (
                  <Txt variant="caption" tone="muted">
                    {metric.unit}
                  </Txt>
                )}
              </View>
            ))}
          </View>
          {average !== null && (
            <Txt variant="caption" tone="muted">
              {t("mobile:parity.insights.average", {
                value: number(average),
                unit: t(
                  points
                    ? "mobile:parity.insights.points"
                    : "mobile:parity.insights.issues",
                ),
                cycles: new Intl.NumberFormat(currentLocale()).format(
                  velocity.data?.rows.find((row) => row.series === "average")
                    ?.samples ?? 0,
                ),
              })}
            </Txt>
          )}
          {throughput.data && (
            <>
              <Txt variant="caption" tone="muted">
                {t("mobile:parity.insights.weekly")}
              </Txt>
              <ThroughputChart report={throughput.data} />
            </>
          )}
          {(throughput.data?.partialHistory ||
            velocity.data?.partialHistory ||
            duration.data?.partialHistory) && (
            <Txt variant="caption" tone="muted">
              {t("mobile:parity.insights.partialHistory")}
            </Txt>
          )}
        </>
      )}
    </Group>
  );
}

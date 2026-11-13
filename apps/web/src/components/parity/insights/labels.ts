import { useTranslation } from "react-i18next";
import type { Insights, InsightRow } from "@/fetchers/parity/insights";
import { getPriorityLabel } from "@/lib/i18n/domain";
import { formatCalendarDay } from "../cycles/chart";

export function useInsightLabels() {
  const { t, i18n } = useTranslation();
  return {
    measure: (measure: Insights["measure"]) =>
      t(`parity:insights.measures.${measure}`),
    series: (series: InsightRow["series"]) =>
      t(`parity:insights.series.${series}`),
    number: (value: number) =>
      new Intl.NumberFormat(i18n.language, { maximumFractionDigits: 2 }).format(
        value,
      ),
    key: (key: string, label: string | null, slice: Insights["slice"]) => {
      if (slice === "week" || slice === "day")
        return formatCalendarDay(key, i18n.language);
      if (slice === "priority") return getPriorityLabel(key);
      if (slice === "category")
        return t(
          `parity:insights.states.${key as "backlog" | "unstarted" | "started" | "completed" | "canceled"}`,
        );
      if (label) return label;
      if (slice === "assignee") return t("parity:cycles.unassigned");
      if (slice === "cycle") return t("parity:cycles.noCycle");
      return t("parity:insights.noLabel");
    },
  };
}

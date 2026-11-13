import { useTranslation } from "react-i18next";
import type { Insights } from "@/fetchers/parity/insights";
import { durationMeasure } from "./chart-data";
import { useInsightLabels } from "./labels";

export function ReportTable({
  report,
  points,
}: {
  report: Insights;
  points: boolean;
}) {
  const { t } = useTranslation();
  const labels = useInsightLabels();
  return (
    <details className="mt-4 text-xs">
      <summary className="cursor-pointer text-muted-foreground">
        {t("parity:insights.viewData")}
      </summary>
      <div className="mt-3 max-h-72 overflow-auto">
        <table className="w-full text-left">
          <caption className="sr-only">
            {labels.measure(report.measure)}
          </caption>
          <thead>
            <tr className="border-b">
              <th className="p-2">{t("parity:insights.group")}</th>
              <th className="p-2">{t("parity:insights.seriesLabel")}</th>
              <th className="p-2">{t("parity:insights.value")}</th>
              <th className="p-2">{t("parity:insights.samples")}</th>
            </tr>
          </thead>
          <tbody>
            {report.rows.map((row) => {
              const value =
                points && !durationMeasure(report.measure)
                  ? row.points
                  : row.value;
              return (
                <tr
                  key={`${row.key}:${row.series}`}
                  className="border-b last:border-0"
                >
                  <th scope="row" className="p-2 font-normal">
                    {labels.key(row.key, row.label, report.slice)}
                  </th>
                  <td className="p-2">{labels.series(row.series)}</td>
                  <td className="p-2 tabular-nums">
                    {value === null ? "—" : labels.number(value)}
                  </td>
                  <td className="p-2 tabular-nums">
                    {labels.number(row.samples)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </details>
  );
}

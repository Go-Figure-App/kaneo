import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import type { TaskTemplate } from "@/fetchers/parity/views";
import { estimateChoices, estimateLabel } from "../cycles/estimates";
import { usePlanningEnabled } from "../planning/queries";
import { useTemplates, useViewOptions } from "./queries";
export function TemplatePicker({
  workspaceId,
  projectId,
  estimate,
  onEstimate,
  onApply,
  disabled,
  dirty,
}: {
  workspaceId: string;
  projectId: string;
  estimate: number | null;
  onEstimate: (value: number | null) => void;
  onApply: (template: TaskTemplate) => void;
  disabled: boolean;
  dirty: boolean;
}) {
  const { t, i18n } = useTranslation();
  const enabled = usePlanningEnabled("views");
  const cyclesEnabled = usePlanningEnabled("cycles");
  const query = useTemplates(projectId);
  const options = useViewOptions(workspaceId, projectId);
  const items = query.isError
    ? []
    : [
        ...new Map(
          query.data?.pages
            .flatMap((page) => page.items)
            .map((item) => [item.name, item]),
        ).values(),
      ];
  const scale = options.data?.estimateScale ?? "none";
  const estimates = estimateChoices(scale);
  if (!enabled || !workspaceId || !projectId) return null;
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <select
          aria-label={t("parity:views.applyTemplate")}
          className="max-w-64 rounded-md border bg-background p-2"
          value=""
          disabled={disabled || query.isPending || query.isError}
          onChange={(event) => {
            const template = items.find(
              (item) => item.name === event.target.value,
            );
            if (
              template &&
              (!dirty || window.confirm(t("parity:views.templateReplace")))
            )
              onApply(template);
          }}
        >
          <option value="">{t("parity:views.applyTemplate")}</option>
          {items.map((template) => (
            <option key={template.name} value={template.name}>
              {template.name}
            </option>
          ))}
        </select>
        {cyclesEnabled && (
          <label className="flex items-center gap-2">
            {t("parity:views.filters.estimate")}
            <select
              className="rounded-md border bg-background p-2"
              disabled={disabled || options.isPending || options.isError}
              value={estimate ?? ""}
              onChange={(event) =>
                onEstimate(
                  event.target.value === "" ? null : Number(event.target.value),
                )
              }
            >
              <option value="">{t("parity:views.missing")}</option>
              {estimate !== null && !estimates.includes(estimate) && (
                <option value={estimate}>
                  {estimate} · {t("parity:views.unknown")}
                </option>
              )}
              {estimates.map((value) => (
                <option key={value} value={value}>
                  {estimateLabel(value, scale, i18n.language)}
                </option>
              ))}
            </select>
          </label>
        )}
        <Link
          className="text-muted-foreground hover:underline"
          to="/dashboard/workspace/$workspaceId/views/templates"
          params={{ workspaceId }}
          target="_blank"
          rel="noopener noreferrer"
        >
          {t("parity:views.manageTemplates")}
        </Link>
        {!query.isError && query.hasNextPage && (
          <Button
            size="sm"
            variant="ghost"
            type="button"
            disabled={query.isFetchingNextPage}
            onClick={() => query.fetchNextPage()}
          >
            {t("parity:views.more")}
          </Button>
        )}
      </div>
      {query.error && (
        <div role="alert" className="text-xs text-destructive">
          {query.error.message}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => query.refetch()}
          >
            {t("parity:planning.retry")}
          </Button>
        </div>
      )}
    </div>
  );
}

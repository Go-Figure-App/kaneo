import { useTranslation } from "react-i18next";
import type { Roadmap } from "@/fetchers/parity/roadmap";
import {
  healthValues,
  projectStatuses,
  usePlanningLabels,
} from "../planning/labels";
import { emptyFilters, type Filters } from "./grouping";
import { Button } from "@/components/ui/button";

export function RoadmapFilters({
  data,
  filters,
  onChange,
}: {
  data: Roadmap;
  filters: Filters;
  onChange: (value: Filters) => void;
}) {
  const { t } = useTranslation();
  const labels = usePlanningLabels();
  const leads = new Map(
    data.projects.flatMap((project) =>
      project.leadId
        ? [[project.leadId, project.leadName ?? project.leadId] as const]
        : [],
    ),
  );
  const input = "h-8 max-w-44 rounded-md border bg-background px-2 text-xs";
  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        className={input}
        aria-label={t("parity:planning.status")}
        value={filters.status}
        onChange={(event) =>
          onChange({ ...filters, status: event.target.value })
        }
      >
        <option value="">{t("parity:roadmap.allStatuses")}</option>
        {projectStatuses.map((value) => (
          <option key={value} value={value}>
            {labels.status[value]}
          </option>
        ))}
      </select>
      <select
        className={input}
        aria-label={t("parity:planning.lead")}
        value={filters.lead}
        onChange={(event) => onChange({ ...filters, lead: event.target.value })}
      >
        <option value="">{t("parity:roadmap.allLeads")}</option>
        <option value="none">{t("parity:planning.noLead")}</option>
        {[...leads].map(([id, name]) => (
          <option key={id} value={id}>
            {name}
          </option>
        ))}
      </select>
      <select
        className={input}
        aria-label={t("parity:planning.initiatives")}
        value={filters.initiative}
        onChange={(event) =>
          onChange({ ...filters, initiative: event.target.value })
        }
      >
        <option value="">{t("parity:roadmap.allInitiatives")}</option>
        <option value="none">{t("parity:roadmap.noInitiative")}</option>
        {data.initiatives.map((initiative) => (
          <option key={initiative.id} value={initiative.id}>
            {initiative.name}
          </option>
        ))}
      </select>
      <select
        className={input}
        aria-label={t("parity:planning.health")}
        value={filters.health}
        onChange={(event) =>
          onChange({ ...filters, health: event.target.value })
        }
      >
        <option value="">{t("parity:roadmap.allHealth")}</option>
        {healthValues.map((value) => (
          <option key={value} value={value}>
            {labels.health[value]}
          </option>
        ))}
      </select>
      {Object.values(filters).some(Boolean) && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onChange(emptyFilters)}
        >
          {t("parity:roadmap.clearFilters")}
        </Button>
      )}
    </div>
  );
}

import { useTranslation } from "react-i18next";
import type { TemplateInput } from "@/fetchers/parity/views";
import useGetProjectMembers from "@/hooks/queries/workspace-users/use-get-project-members";
import { getPriorityLabel } from "@/lib/i18n/domain";
import { estimateChoices, estimateLabel } from "../cycles/estimates";
import { useViewOptions } from "./queries";
export function TemplateDefaults({
  workspaceId,
  projectId,
  value,
  onChange,
}: {
  workspaceId: string;
  projectId: string;
  value: TemplateInput["defaults"];
  onChange: (value: TemplateInput["defaults"]) => void;
}) {
  const { t, i18n } = useTranslation();
  const options = useViewOptions(workspaceId, projectId);
  const members = useGetProjectMembers({ workspaceId, projectId });
  const scale = options.data?.estimateScale ?? "none";
  const estimates = estimateChoices(scale);
  return (
    <fieldset className="space-y-3">
      <legend className="mb-2 text-sm font-medium">
        {t("parity:views.templateDefaults")}
      </legend>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1 text-sm">
          {t("parity:views.filters.priority")}
          <select
            className="rounded border bg-background p-2"
            value={value.priority ?? "no-priority"}
            onChange={(event) =>
              onChange({
                ...value,
                priority: event.target
                  .value as TemplateInput["defaults"]["priority"],
              })
            }
          >
            {["no-priority", "low", "medium", "high", "urgent"].map(
              (priority) => (
                <option key={priority} value={priority}>
                  {getPriorityLabel(priority)}
                </option>
              ),
            )}
          </select>
        </label>
        <label className="grid gap-1 text-sm">
          {t("parity:views.filters.assignee")}
          <select
            className="rounded border bg-background p-2"
            disabled={members.isPending || members.isError}
            value={value.assigneeId ?? ""}
            onChange={(event) =>
              onChange({ ...value, assigneeId: event.target.value || null })
            }
          >
            <option value="">{t("parity:views.unassigned")}</option>
            {value.assigneeId &&
              !members.data?.some(
                (member) => member.id === value.assigneeId,
              ) && (
                <option value={value.assigneeId}>
                  {t("parity:views.unknown")}
                </option>
              )}
            {!members.isError &&
              members.data?.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name}
                </option>
              ))}
          </select>
        </label>
        <label className="grid gap-1 text-sm">
          {t("parity:views.filters.estimate")}
          <select
            className="rounded border bg-background p-2"
            disabled={options.isPending || options.isError}
            value={value.estimate ?? ""}
            onChange={(event) =>
              onChange({
                ...value,
                estimate:
                  event.target.value === "" ? null : Number(event.target.value),
              })
            }
          >
            <option value="">{t("parity:views.missing")}</option>
            {value.estimate != null &&
              (scale === "none" || !estimates.includes(value.estimate)) && (
                <option value={value.estimate}>
                  {value.estimate} · {t("parity:views.unknown")}
                </option>
              )}
            {scale !== "none" &&
              estimates.map((estimate) => (
                <option key={estimate} value={estimate}>
                  {estimateLabel(estimate, scale, i18n.language)}
                </option>
              ))}
          </select>
        </label>
      </div>
      <fieldset className="flex max-h-32 flex-wrap gap-3 overflow-auto">
        <legend className="mb-1 text-sm">
          {t("parity:views.filters.label")}
        </legend>
        {[
          ...new Set([
            ...(value.labels ?? []),
            ...(!options.isError
              ? (options.data?.labels.map((label) => label.name) ?? [])
              : []),
          ]),
        ].map((name) => (
          <label className="flex items-center gap-1.5 text-xs" key={name}>
            <input
              type="checkbox"
              checked={value.labels?.includes(name) ?? false}
              onChange={(event) =>
                onChange({
                  ...value,
                  labels: event.target.checked
                    ? [...(value.labels ?? []), name]
                    : value.labels?.filter((label) => label !== name),
                })
              }
            />
            {name}
          </label>
        ))}
      </fieldset>
      {(options.error || members.error) && (
        <p role="alert" className="text-xs text-destructive">
          {options.error?.message ?? members.error?.message}
        </p>
      )}
    </fieldset>
  );
}

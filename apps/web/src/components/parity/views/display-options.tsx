import { useTranslation } from "react-i18next";
import { Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { ViewDisplay } from "@/fetchers/parity/views";
export function DisplayOptions({
  value,
  onChange,
}: {
  value: ViewDisplay;
  onChange: (value: ViewDisplay) => void;
}) {
  const { t } = useTranslation();
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm">
          <Settings2 className="size-4" />
          {t("parity:views.display")}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 space-y-4">
        <label className="grid gap-1 text-sm">
          {t("parity:views.layout")}
          <select
            className="rounded border bg-background p-2"
            value={value.layout}
            onChange={(event) =>
              onChange({
                ...value,
                layout: event.target.value as ViewDisplay["layout"],
              })
            }
          >
            {(["list", "board"] as const).map((option) => (
              <option key={option} value={option}>
                {t(`parity:views.${option}`)}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-sm">
          {t("parity:views.groupBy")}
          <select
            className="rounded border bg-background p-2"
            value={value.groupBy}
            onChange={(event) =>
              onChange({
                ...value,
                groupBy: event.target.value as ViewDisplay["groupBy"],
              })
            }
          >
            {(
              [
                "state",
                "assignee",
                "project",
                "priority",
                "cycle",
                "label",
              ] as const
            ).map((option) => (
              <option key={option} value={option}>
                {t(`parity:views.groups.${option}`)}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-sm">
          {t("parity:views.orderBy")}
          <select
            className="rounded border bg-background p-2"
            value={value.orderBy}
            onChange={(event) =>
              onChange({
                ...value,
                orderBy: event.target.value as ViewDisplay["orderBy"],
              })
            }
          >
            {(["priority", "created", "updated", "due"] as const).map(
              (option) => (
                <option key={option} value={option}>
                  {t(`parity:views.orders.${option}`)}
                </option>
              ),
            )}
          </select>
        </label>
        <select
          aria-label={t("parity:views.direction")}
          className="w-full rounded border bg-background p-2 text-sm"
          value={value.direction}
          onChange={(event) =>
            onChange({
              ...value,
              direction: event.target.value as ViewDisplay["direction"],
            })
          }
        >
          <option value="asc">{t("parity:views.ascending")}</option>
          <option value="desc">{t("parity:views.descending")}</option>
        </select>
        <fieldset className="grid grid-cols-2 gap-2 text-xs">
          <legend className="mb-2 text-sm font-medium">
            {t("parity:views.properties")}
          </legend>
          {(
            [
              "identifier",
              "status",
              "priority",
              "assignee",
              "project",
              "cycle",
              "milestone",
              "estimate",
              "labels",
              "due",
            ] as const
          ).map((property) => (
            <label key={property} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={value.properties.includes(property)}
                onChange={(event) =>
                  onChange({
                    ...value,
                    properties: event.target.checked
                      ? [...value.properties, property]
                      : value.properties.filter((item) => item !== property),
                  })
                }
              />
              {t(`parity:views.propertyNames.${property}`)}
            </label>
          ))}
        </fieldset>
      </PopoverContent>
    </Popover>
  );
}

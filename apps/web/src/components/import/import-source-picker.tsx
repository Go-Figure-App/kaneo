import { useTranslation } from "react-i18next";
import { IMPORT_SOURCES } from "@/components/import/import-source-definitions";
import { ImportSourceRow } from "@/components/import/import-source-row";
import { SettingsSectionHeader } from "@/components/settings/settings-section-header";
import { usePlanningEnabled } from "@/components/parity/planning/queries";
import { planningImportSource } from "@/components/parity/import/source";

export function ImportSourcePicker() {
  const { t } = useTranslation();
  const planning = usePlanningEnabled("import");

  return (
    <section className="space-y-3">
      <SettingsSectionHeader
        title={t("settings:workspaceImport.sources.title")}
        description={t("settings:workspaceImport.sources.description")}
      />
      <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
        {IMPORT_SOURCES.map((source) => (
          <ImportSourceRow
            key={source.id}
            source={planningImportSource(source, planning)}
          />
        ))}
      </ul>
    </section>
  );
}

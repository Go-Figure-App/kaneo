import { useState } from "react";
import { useTranslation } from "react-i18next";
import WorkspaceLayout from "@/components/common/workspace-layout";
import PageTitle from "@/components/page-title";
import { Button } from "@/components/ui/button";
import { usePlanningEnabled } from "../planning/queries";
import { useViewOptions } from "./queries";
import { TemplateList } from "./template-list";
export function TemplatesPage({ workspaceId }: { workspaceId: string }) {
  const { t } = useTranslation();
  const enabled = usePlanningEnabled("views");
  const options = useViewOptions(workspaceId);
  const [selected, setSelected] = useState("");
  const projectId =
    !options.isError &&
    options.data?.projects.some((project) => project.id === selected)
      ? selected
      : "";
  return (
    <WorkspaceLayout title={t("parity:views.templates")}>
      <PageTitle title={t("parity:views.templates")} />
      <div className="h-full overflow-auto p-4 sm:p-6">
        <div className="mx-auto max-w-3xl space-y-6">
          <h1 className="text-xl font-semibold">
            {t("parity:views.templates")}
          </h1>
          {!enabled ? (
            <p>{t("parity:planning.unavailable")}</p>
          ) : (
            <>
              <label className="grid max-w-sm gap-2 text-sm">
                {t("parity:views.chooseProject")}
                <select
                  className="rounded-md border bg-background p-2"
                  value={projectId}
                  disabled={options.isPending || options.isError}
                  onChange={(event) => setSelected(event.target.value)}
                >
                  <option value="">{t("parity:views.chooseProject")}</option>
                  {!options.isError &&
                    options.data?.projects.map((project) => (
                      <option key={project.id} value={project.id}>
                        {project.name}
                      </option>
                    ))}
                </select>
              </label>
              {options.error && (
                <div role="alert">
                  {options.error.message}
                  <Button variant="ghost" onClick={() => options.refetch()}>
                    {t("parity:planning.retry")}
                  </Button>
                </div>
              )}
              {projectId && (
                <TemplateList
                  key={projectId}
                  workspaceId={workspaceId}
                  projectId={projectId}
                />
              )}
            </>
          )}
        </div>
      </div>
    </WorkspaceLayout>
  );
}

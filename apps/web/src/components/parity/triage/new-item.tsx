import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { createTriage, getTriageProjects } from "@/fetchers/parity/triage";
import { refreshTriage } from "./queries";

export function NewTriageItem({ workspaceId }: { workspaceId: string }) {
  const { t } = useTranslation();
  const client = useQueryClient();
  const [open, setOpen] = useState(false);
  const [projectId, setProjectId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const projects = useQuery({
    queryKey: ["parity", "triage", workspaceId, "projects"],
    queryFn: () => getTriageProjects(workspaceId),
    enabled: open,
  });
  const selected =
    projects.data?.find((project) => project.id === projectId)?.id ??
    projects.data?.[0]?.id;
  const mutation = useMutation({
    mutationFn: () => createTriage(selected!, { title, description }),
    onSuccess: async () => {
      setOpen(false);
      setTitle("");
      setDescription("");
      await refreshTriage(client);
    },
  });
  return (
    <>
      <Button
        onClick={() => {
          mutation.reset();
          setOpen(true);
        }}
      >
        {t("parity:triage.newItem")}
      </Button>
      <Dialog
        open={open}
        onOpenChange={(value) => {
          if (!mutation.isPending) setOpen(value);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("parity:triage.newItem")}</DialogTitle>
            <DialogDescription>
              {t("parity:triage.description")}
            </DialogDescription>
          </DialogHeader>
          <form
            className="flex flex-col gap-4"
            onSubmit={(event) => {
              event.preventDefault();
              if (selected && title.trim() && !mutation.isPending)
                mutation.mutate();
            }}
          >
            <label className="flex flex-col gap-1 text-sm">
              {t("tasks:properties.project")}
              <select
                className="rounded-md border bg-background p-2"
                value={selected ?? ""}
                onChange={(event) => setProjectId(event.target.value)}
                required
              >
                {!selected && (
                  <option value="">{t("parity:triage.unavailable")}</option>
                )}
                {projects.data?.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm">
              {t("tasks:sort.fields.title")}
              <input
                autoFocus
                className="rounded-md border bg-background p-2"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                maxLength={500}
                required
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              {t("settings:projectGeneral.descriptionLabel")}
              <textarea
                className="min-h-28 rounded-md border bg-background p-2"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                maxLength={50000}
              />
            </label>
            {mutation.error || projects.error ? (
              <p role="alert" className="text-destructive">
                {mutation.error?.message ?? projects.error?.message}
              </p>
            ) : null}
            <Button
              type="submit"
              disabled={!selected || !title.trim() || mutation.isPending}
            >
              {t("parity:triage.send")}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

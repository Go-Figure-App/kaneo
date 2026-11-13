import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { submitIntake } from "@/fetchers/parity/triage";

export function IntakeForm({ token }: { token: string }) {
  const { t } = useTranslation();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [reporterEmail, setReporterEmail] = useState("");
  const mutation = useMutation({
    mutationKey: ["parity"],
    mutationFn: () =>
      submitIntake(token, { title, description, reporterEmail }),
  });
  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col justify-center gap-6 px-6 py-12">
      <div>
        <h1 className="text-2xl font-semibold">{t("parity:triage.newItem")}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {t("parity:triage.intakeDescription")}
        </p>
      </div>
      {mutation.isSuccess ? (
        <p role="status" className="rounded-lg border p-6">
          {t("parity:triage.received")}
        </p>
      ) : (
        <form
          className="flex flex-col gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (!mutation.isPending) mutation.mutate();
          }}
        >
          <label className="flex flex-col gap-1 text-sm">
            {t("tasks:sort.fields.title")}
            <input
              className="rounded-md border bg-background p-3"
              required
              maxLength={500}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            {t("settings:projectGeneral.descriptionLabel")}
            <textarea
              className="min-h-36 rounded-md border bg-background p-3"
              maxLength={50000}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            {t("auth:forms.email")}
            <input
              type="email"
              autoComplete="email"
              className="rounded-md border bg-background p-3"
              required
              maxLength={254}
              value={reporterEmail}
              onChange={(event) => setReporterEmail(event.target.value)}
            />
          </label>
          {mutation.error && (
            <p role="alert" className="text-destructive">
              {mutation.error.message}
            </p>
          )}
          <Button type="submit" disabled={mutation.isPending || !title.trim()}>
            {t("parity:triage.send")}
          </Button>
        </form>
      )}
    </main>
  );
}

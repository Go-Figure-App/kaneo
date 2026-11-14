import { useTranslation } from "react-i18next";

export function TracingBranding() {
  const { t } = useTranslation();

  return (
    <a
      href="https://tracing.gofigureapp.io"
      target="_blank"
      rel="noopener noreferrer"
      className="hover:text-foreground transition-colors"
    >
      {t("publicProject:branding.poweredBy")}{" "}
      <span className="font-medium">{t("common:appName")}</span>
    </a>
  );
}

export function emailAsset(name: string): string {
  const explicit =
    process.env.TRACING_EMAIL_ASSETS_URL ?? process.env.KANEO_EMAIL_ASSETS_URL;
  const clientUrl =
    process.env.TRACING_CLIENT_URL ?? process.env.KANEO_CLIENT_URL;
  const base = explicit
    ? explicit
    : clientUrl
      ? `${clientUrl.replace(/\/$/, "")}/email`
      : "/static";

  return `${base.replace(/\/$/, "")}/${name}.png`;
}

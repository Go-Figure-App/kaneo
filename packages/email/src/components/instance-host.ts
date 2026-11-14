export function instanceHost(): string | undefined {
  const clientUrl =
    process.env.TRACING_CLIENT_URL || process.env.KANEO_CLIENT_URL;
  if (!clientUrl) return undefined;

  try {
    return new URL(clientUrl).host;
  } catch {
    return undefined;
  }
}

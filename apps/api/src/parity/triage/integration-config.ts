export const triageIntegrationTypes = ["github", "gitlab", "gitea"];

export function integrationConfig(raw: string): Record<string, unknown> {
  const parsed: unknown = JSON.parse(raw);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
    throw new Error("Invalid integration configuration");
  return parsed as Record<string, unknown>;
}

export function integrationTriageEnabled(raw: string) {
  try {
    return integrationConfig(raw).parityTriageEnabled === true;
  } catch {
    return false;
  }
}

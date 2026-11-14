export function isCloud(): boolean {
  return (process.env.TRACING_CLOUD ?? process.env.KANEO_CLOUD) === "true";
}

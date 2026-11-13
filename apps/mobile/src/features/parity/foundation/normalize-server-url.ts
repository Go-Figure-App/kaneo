/** Normalize the configured origin before both authentication and session persistence. */
export function normalizeServerUrl(input: string): string {
  let url = input.trim().replace(/\/+$/, "");
  if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
  if (url.endsWith("/api")) url = url.slice(0, -4);
  return url.replace(/\/+$/, "");
}

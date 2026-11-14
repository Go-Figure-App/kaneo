// Persist the origin in Gitea so delayed webhooks and later imports also skip echoes.
const KANEO_COMMENT_PREFIX = "<!-- kaneo:comment -->\n\n";

export function markTracingComment(body: string): string {
  // Keep the marker outside user-controlled Markdown, including unclosed code fences.
  return `${KANEO_COMMENT_PREFIX}${body}`;
}

export function isTracingComment(body: string): boolean {
  return body.startsWith(KANEO_COMMENT_PREFIX);
}

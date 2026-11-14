export const REPO = "Go-Figure-App/tracing";

export function prNumber(value) {
  const match = String(value)
    .trim()
    .match(
      /^(?:https:\/\/github\.com\/Go-Figure-App\/tracing\/pull\/)?([1-9]\d{0,6})\/?$/,
    );
  if (!match)
    throw new Error(
      "Enter a Tracing PR number or its github.com/Go-Figure-App/tracing/pull/… URL.",
    );
  return Number(match[1]);
}

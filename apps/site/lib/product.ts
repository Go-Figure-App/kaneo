import { landing } from "@/lib/landing";

export const appStoreUrl =
  "https://github.com/Go-Figure-App/tracing/tree/main/apps/mobile";

// The homepage and text exports use the same answers so product facts stay aligned.
export const productAnswers = [
  { ...landing.product.hosting, href: "/pricing" },
  { ...landing.product.planning, href: "/openproject-alternative" },
  { ...landing.product.sso, href: "/docs/core/social-providers/custom-oauth" },
  { ...landing.product.agents, href: "/docs/core/integrations/mcp" },
  { ...landing.product.mobile, href: appStoreUrl },
];

export function productMarkdown() {
  return `${landing.product.overview}\n\n${productAnswers
    .map(
      ({ question, answer, link, href }) =>
        `### ${question}\n\n${answer}\n\n[${link}](${new URL(href, "https://tracing.gofigureapp.io")})`,
    )
    .join("\n\n")}`;
}

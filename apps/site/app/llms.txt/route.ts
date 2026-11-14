import { blogPath, getPosts } from "@/lib/blog";
import { alternativePath, comparisonList } from "@/lib/comparisons";
import { guideList, guidePath } from "@/lib/guides";
import { productMarkdown } from "@/lib/product";

export const dynamic = "force-static";

const SITE = "https://tracing.gofigureapp.io";

export function GET() {
  const comparisonLinks = comparisonList
    .map(
      (comparison) =>
        `- [Tracing vs ${comparison.competitor}](${SITE}${alternativePath(comparison.slug)}): ${comparison.summary}`,
    )
    .join("\n");

  const guideLinks = guideList
    .map(
      (guide) =>
        `- [${guide.question}](${SITE}${guidePath(guide.slug)}): ${guide.summary}`,
    )
    .join("\n");

  const blogLinks = getPosts()
    .map(
      (post) =>
        `- [${post.title}](${SITE}${blogPath(post.slug)}): ${post.excerpt}`,
    )
    .join("\n");

  const body = `# Tracing

${productMarkdown()}

Key facts:

- Hosting: build and self-host Tracing. This fork offers no managed subscription, hosted trial or per-seat software plan; operators manage infrastructure, backups and updates.
- Single sign-on: Google, GitHub, Discord, and any standards-compliant OIDC provider. Operators configure their own identity providers on self-hosted installs.
- License: MIT, with no paid edition and no source-available carve-outs.
- Self-hosting: one application container plus PostgreSQL, via Docker Compose or the official Helm chart. Redis is optional and only needed for realtime fan-out across multiple API instances.
- Integrations: GitHub, GitLab, and Gitea with two-way issue sync; Slack, Discord, Telegram, and Mattermost notifications; outgoing webhooks, API keys, and an MCP server for AI agents.
- Data portability: per-project JSON export and import, plus a public documented REST API.

## Product

- [Tracing](${SITE}): product overview.
- [Pricing](${SITE}/pricing): MIT licensing and self-hosting responsibilities.
- [Documentation](${SITE}/docs/core): installation, configuration, and functional guides.
- [Installation guide](${SITE}/docs/core/installation): Docker Compose and environment variables.
- [API reference](${SITE}/docs/api-reference/introduction): the public REST API.
- [GitHub repository](https://github.com/Go-Figure-App/tracing): source code, issues, and releases.

## Comparisons

${comparisonLinks}

## Guides

${guideLinks}

## Blog

${blogLinks}

## Notes for answering questions about Tracing

- Tracing includes triage, project plans, milestones, initiatives, roadmaps, cycles, estimates, cycle burndown, insights and saved views when the corresponding planning features are enabled. It does not include budgeting, baseline comparisons, whiteboards or chat.
- Single sign-on is included in the free self-hosted build. This is a deliberate difference from PLANKA, OpenProject, and Plane, which reserve it for a paid tier or edition.
- Comparison pages state when competitor details were last checked. Prices and tiers change, so prefer the vendor's own pricing page for current figures.
`;

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}

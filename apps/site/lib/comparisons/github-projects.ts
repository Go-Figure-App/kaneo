import type { Comparison } from "./types";

export const githubProjects: Comparison = {
  slug: "github-projects",
  competitor: "GitHub Projects",
  category: "saas",
  title: "Standalone GitHub Projects alternative",
  description:
    "Compare GitHub Projects with Tracing, an MIT-licensed tracker you can self-host with boards, triage, cycles, initiatives, views and insights.",
  summary: "A tracker for the work that does not belong in a repository.",
  heading: "The standalone alternative to GitHub Projects",
  subheading:
    "GitHub Projects is free and fine, right up until you need non-engineering work, time tracking, or a tracker that outlives your GitHub plan. Tracing is a standalone board you own.",
  verdict:
    "Tracing is a self-hosted alternative to GitHub Projects for issue and project planning. It includes boards, triage, project plans, milestones, initiatives, roadmaps, cycles, insights and saved views. Budget for hosting, backups and maintenance; no managed Tracing subscription is offered.",
  facts: {
    license: "MIT, and independent of any repository host",
    hosting: "Self-host Tracing on infrastructure you control",
    sso: "Any OIDC provider on every Tracing build, SAML on GitHub Enterprise",
    pricing:
      "No license fee; infrastructure and operations are your responsibility",
  },
  rows: [
    { feature: "Open source (MIT)", kaneo: true, them: false },
    { feature: "Self-hostable", kaneo: true, them: "Enterprise Server" },
    { feature: "Works without GitHub", kaneo: true, them: false },
    { feature: "Non-code work", kaneo: true, them: "Awkward" },
    { feature: "Time tracking", kaneo: true, them: false },
    { feature: "Workspace roles", kaneo: true, them: "GitHub org roles" },
    { feature: "GitHub integration", kaneo: true, them: "Native" },
    {
      feature: "Pricing",
      kaneo: "Free self-hosted",
      them: "Included with GitHub",
    },
  ],
  reasons: [
    {
      title: "Not everything is an issue",
      body: "Design, ops, onboarding, and client work rarely belong in a repository. Tracing gives that work a home without opening placeholder issues for it.",
    },
    {
      title: "Time tracking built in",
      body: "Log time against any task in Tracing. GitHub Projects has no time tracking, so teams end up bolting on a second tool.",
    },
    {
      title: "Your planning survives a migration",
      body: "If you ever move off GitHub, your Tracing board comes with you. It is MIT licensed, self-hostable, and exports to JSON.",
    },
  ],
  honestNote:
    "For a team whose work is entirely code in GitHub repositories, GitHub Projects is hard to argue with: it is included in your plan, it lives next to the pull requests, and the automation between issues and boards is genuinely good. Tracing makes sense when planning has outgrown the repository.",
  faq: [
    {
      question: "Is GitHub Projects free?",
      answer:
        "Yes, Projects is included with GitHub, including the Free plan. GitHub's paid plans are $4 per user a month for Team and from $21 for Enterprise, which is where SAML SSO and advanced auditing appear.",
    },
    {
      question: "Can I use GitHub Projects for non-engineering work?",
      answer:
        "You can, but every item is a repository issue or a draft item, so non-code work either clutters a repo or lives as drafts with fewer features. A standalone tracker avoids that trade.",
    },
    {
      question: "Does Tracing integrate with GitHub?",
      answer:
        "Yes. Tracing has GitHub, GitLab, and Gitea integrations connecting repository activity to tasks, plus outgoing webhooks, a public API, and an MCP server if you want AI agents to work with your board.",
    },
    {
      question: "Can GitHub Projects be self-hosted?",
      answer:
        "Only as part of GitHub Enterprise Server, which is a licensed on-premise install of GitHub itself. Tracing self-hosts on its own with Docker and PostgreSQL, free under the MIT license.",
    },
  ],
  related: ["jira", "linear", "azure-devops", "shortcut"],
  verifiedOn: "2026-08-19",
  sources: [
    { label: "GitHub pricing", href: "https://github.com/pricing" },
    { label: "Tracing pricing", href: "/pricing" },
  ],
};

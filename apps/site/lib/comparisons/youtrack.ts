import type { Comparison } from "./types";

export const youtrack: Comparison = {
  slug: "youtrack",
  competitor: "YouTrack",
  category: "saas",
  title: "YouTrack alternative: Tracing vs YouTrack",
  description:
    "Compare YouTrack with Tracing, an MIT-licensed tracker you can self-host with boards, triage, cycles, initiatives, views and insights.",
  summary: "No annual server licence and no ten-user ceiling.",
  heading: "The YouTrack alternative without the server licence",
  subheading:
    "Tracing is an MIT-licensed option for teams evaluating YouTrack who want to operate their own project tracker.",
  verdict:
    "Tracing is a self-hosted alternative to YouTrack for issue and project planning. It includes boards, triage, project plans, milestones, initiatives, roadmaps, cycles, insights and saved views. Budget for hosting, backups and maintenance; no managed Tracing subscription is offered.",
  facts: {
    license: "MIT, versus a proprietary JetBrains licence",
    hosting: "Self-host Tracing on infrastructure you control",
    sso: "Free on every Tracing build",
    pricing:
      "No license fee; infrastructure and operations are your responsibility",
  },
  rows: [
    { feature: "Open source (MIT)", kaneo: true, them: false },
    {
      feature: "Self-hostable",
      kaneo: "Free, unlimited",
      them: "Paid licence",
    },
    { feature: "Own your data", kaneo: true, them: true },
    {
      feature: "Free tier",
      kaneo: "Unlimited, self-hosted",
      them: "Up to 10 users",
    },
    { feature: "Query language", kaneo: "Search & filters", them: "Advanced" },
    { feature: "Workflow scripting", kaneo: "Rules", them: "JavaScript" },
    { feature: "Learning curve", kaneo: "Minutes", them: "Moderate" },
    {
      feature: "Cloud pricing",
      kaneo: "No managed hosting plan",
      them: "From $4.50/user/mo",
    },
  ],
  reasons: [
    {
      title: "No licence to renew",
      body: "Self-hosted Tracing is MIT licensed with no seat count, no annual renewal, and no licence server. You run the container and that is the arrangement.",
    },
    {
      title: "Simpler by design",
      body: "YouTrack is deep: custom fields, a query language, and JavaScript workflows. Tracing's boards, backlog, and workflow rules are meant to be understood in an afternoon.",
    },
    {
      title: "Everything in every build",
      body: "SSO, roles, time tracking, integrations, API keys, and MCP access come with Tracing wherever you run it.",
    },
  ],
  honestNote:
    "YouTrack is a serious issue tracker with an excellent query language, powerful workflow scripting, and tight integration with the rest of the JetBrains toolchain. If your team already lives in JetBrains IDEs and you want that depth, Tracing will feel small next to it.",
  faq: [
    {
      question: "Is YouTrack open source?",
      answer:
        "No. YouTrack is proprietary JetBrains software. It has a free tier for up to 10 users in both cloud and server editions, but the source is not published and larger deployments need a paid licence.",
    },
    {
      question: "What does YouTrack cost after the free tier?",
      answer:
        "YouTrack Cloud is priced per user for teams of 11 or more, starting around $4.50 per user a month billed annually. YouTrack Server is sold as an annual licence, starting at roughly $600 a year.",
    },
    {
      question: "What is the best open-source YouTrack alternative?",
      answer:
        "Tracing if you want something light and MIT licensed, Redmine if you want a mature tracker with a large plugin ecosystem, or Plane if you want a Linear-style interface under AGPL.",
    },
    {
      question: "Does Tracing have a query language?",
      answer:
        "No. Tracing has search plus filters on boards and the backlog, which covers day-to-day use. It has no equivalent to YouTrack's saved queries and issue-query syntax.",
    },
  ],
  related: ["jira", "redmine", "linear", "shortcut"],
  verifiedOn: "2026-08-19",
  sources: [
    {
      label: "YouTrack pricing",
      href: "https://www.jetbrains.com/youtrack/buy/",
    },
    { label: "Tracing pricing", href: "/pricing" },
  ],
};

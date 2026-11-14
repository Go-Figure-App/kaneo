import type { Comparison } from "./types";

export const jira: Comparison = {
  slug: "jira",
  competitor: "Jira",
  category: "saas",
  title: "Lighter Jira alternative: Tracing vs Jira",
  description:
    "Compare Jira with Tracing, an MIT-licensed tracker you can self-host with boards, triage, cycles, initiatives, views and insights.",
  summary: "Self-hosted planning as an alternative to Jira.",
  heading: "The lighter Jira alternative for teams that just want to ship",
  subheading:
    "Jira can run a 500-person org, but most teams just want to plan and ship work without the weight. Tracing is a simple, open-source project manager you can self-host or let us run for you.",
  verdict:
    "Tracing is a self-hosted alternative to Jira for issue and project planning. It includes boards, triage, project plans, milestones, initiatives, roadmaps, cycles, insights and saved views. Budget for hosting, backups and maintenance; no managed Tracing subscription is offered.",
  facts: {
    license: "MIT, versus a proprietary licence for Jira",
    hosting: "Self-host Tracing on infrastructure you control",
    sso: "Free on every Tracing build. Jira needs Atlassian Guard or Enterprise",
    pricing:
      "No license fee; infrastructure and operations are your responsibility",
  },
  rows: [
    { feature: "Open source (MIT)", kaneo: true, them: false },
    { feature: "Self-hostable", kaneo: true, them: "Data Center only" },
    { feature: "Own your data", kaneo: true, them: false },
    { feature: "Free to self-host", kaneo: true, them: false },
    { feature: "SSO included", kaneo: "Free", them: "Guard or Enterprise" },
    { feature: "Setup", kaneo: "Minutes", them: "Involved" },
    { feature: "Learning curve", kaneo: "Minutes", them: "Steep" },
    {
      feature: "Cloud pricing",
      kaneo: "No managed hosting plan",
      them: "Per user, higher",
    },
  ],
  reasons: [
    {
      title: "No bloat",
      body: "Boards, backlog, and workflows that work out of the box. No admin console to configure for a week before you can create a task.",
    },
    {
      title: "Own your data",
      body: "Self-host Tracing on your own servers under the MIT license, or use our EU-hosted cloud. Either way you can export everything, anytime.",
    },
    {
      title: "Fair, honest pricing",
      body: "Tracing is MIT licensed and free to self-host, including SSO. Budget separately for infrastructure, backups and operations.",
    },
  ],
  migration: {
    body: "Tracing imports Jira Cloud and Jira Data Center projects from the app with an API token: board columns, issues with their keys, priorities, labels, assignees, sub-tasks, issue links, and comments. Jira is only read, never changed.",
    href: "https://github.com/Go-Figure-App/tracing/blob/main/apps/docs/core/migrations/from-jira.mdx",
    linkText: "Read the import guide",
  },
  honestNote:
    "If you're a large organization that needs deep enterprise workflows, advanced permission schemes, and a big marketplace of add-ons, and you have the time to configure it, Jira is built for exactly that. Tracing is for teams who want to manage work, not administer a tool.",
  faq: [
    {
      question: "Is there a free and open-source alternative to Jira?",
      answer:
        "Yes. Tracing is MIT licensed and free to self-host with no user limits, and there are others worth knowing about, including Redmine, OpenProject, Taiga, and Plane. Tracing is the closest match if you want something small and fast rather than something you configure.",
    },
    {
      question: "Can I self-host Jira?",
      answer:
        "Only through Jira Data Center, which is sold as an annual subscription sized by user tier. Atlassian ended new Jira Server licence sales, so a small team that wants an on-premise tracker generally has to pay Data Center pricing or move to a different tool.",
    },
    {
      question: "Does Tracing have Jira features like sprints and workflows?",
      answer:
        "Tracing has backlog planning, configurable workflow columns, integration-driven workflow rules, Gantt and calendar views, custom fields, task relations, time tracking, and workspace roles. It does not have dedicated sprints with story points and burndown reports, Jira's schemes, custom issue-type hierarchies, or marketplace apps.",
    },
    {
      question: "How much does Tracing cost compared to Jira?",
      answer:
        "Tracing has no license or per-seat fee. You operate the application, database, storage, backups and updates on infrastructure you choose; this fork does not offer a managed hosting plan. Consult Jira's current pricing and terms separately.",
    },
  ],
  related: ["linear", "asana", "clickup", "openproject"],
  guides: [
    {
      label: "Free, open-source Jira alternatives compared",
      href: "/guides/open-source-jira-alternatives",
    },
    {
      label: "Best Jira alternatives, free and paid",
      href: "/blog/best-jira-alternatives",
    },
  ],
  verifiedOn: "2026-08-19",
  sources: [
    {
      label: "Jira pricing",
      href: "https://www.atlassian.com/software/jira/pricing",
    },
    { label: "Tracing pricing", href: "/pricing" },
  ],
};

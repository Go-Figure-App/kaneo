import type { Comparison } from "./types";

export const shortcut: Comparison = {
  slug: "shortcut",
  competitor: "Shortcut",
  category: "saas",
  title: "Shortcut alternative: Tracing vs Shortcut",
  description:
    "Compare Shortcut with Tracing, an MIT-licensed tracker you can self-host with boards, triage, cycles, initiatives, views and insights.",
  summary: "Self-hosted planning as an alternative to Shortcut.",
  heading: "The Shortcut alternative for software teams",
  subheading:
    "Tracing is an MIT-licensed option for teams evaluating Shortcut who want to operate their own project tracker.",
  verdict:
    "Tracing is a self-hosted alternative to Shortcut for issue and project planning. It includes boards, triage, project plans, milestones, initiatives, roadmaps, cycles, insights and saved views. Budget for hosting, backups and maintenance; no managed Tracing subscription is offered.",
  facts: {
    license: "MIT, versus a proprietary licence for Shortcut",
    hosting: "Self-host Tracing on infrastructure you control",
    sso: "Free on every Tracing build, Enterprise tier on Shortcut",
    pricing:
      "No license fee; infrastructure and operations are your responsibility",
  },
  rows: [
    { feature: "Open source (MIT)", kaneo: true, them: false },
    { feature: "Self-hostable", kaneo: true, them: false },
    { feature: "Own your data", kaneo: true, them: false },
    {
      feature: "Free tier",
      kaneo: "Unlimited, self-hosted",
      them: "Up to 10 users",
    },
    { feature: "SSO included", kaneo: "Free", them: "Enterprise" },
    {
      feature: "Git integration",
      kaneo: "GitHub, GitLab, Gitea",
      them: "GitHub, GitLab",
    },
    { feature: "Time tracking", kaneo: true, them: false },
    {
      feature: "Cloud pricing",
      kaneo: "No managed hosting plan",
      them: "From $8.50/user/mo",
    },
  ],
  reasons: [
    {
      title: "The same lightness, without the lock-in",
      body: "Stories, states, and a board that stays out of the way. Tracing keeps the workflow shape Shortcut users like and lets you host it yourself.",
    },
    {
      title: "Free past ten people",
      body: "Shortcut's free plan stops at 10 users. A self-hosted Tracing instance has no seat count at all, so growth costs you nothing.",
    },
    {
      title: "Built-in time tracking",
      body: "Log time against tasks in Tracing without a third-party integration. Shortcut leaves time tracking to external tools.",
    },
  ],
  honestNote:
    "Shortcut has a more developed product-team workflow than Tracing: epics rolling up to milestones, iterations, and reporting that engineering managers actually use. If you need that reporting layer and are happy in the cloud, Shortcut is the stronger fit.",
  faq: [
    {
      question: "Can Shortcut be self-hosted?",
      answer:
        "No. Shortcut is cloud-only SaaS with no on-premise edition, so self-hosting means moving to an open-source tracker such as Tracing, Plane, or Huly.",
    },
    {
      question: "What does Shortcut cost?",
      answer:
        "Shortcut is free for up to 10 users, then $8.50 per user a month for Team and $12 for Business, billed annually, with SSO on the Enterprise plan.",
    },
    {
      question: "Does Tracing link tasks to Git commits and pull requests?",
      answer:
        "Yes. Tracing has GitHub, GitLab, and Gitea integrations that connect repository activity to tasks, plus outgoing webhooks if you want to wire up something else.",
    },
    {
      question: "Does Tracing have epics and iterations?",
      answer:
        "Tracing has projects, a backlog, workflow columns, labels, priorities, and task relations, which cover most of what teams use epics for. It does not have Shortcut's iterations or milestone roll-up reporting.",
    },
  ],
  related: ["linear", "jira", "plane", "youtrack"],
  verifiedOn: "2026-08-19",
  sources: [
    { label: "Shortcut pricing", href: "https://www.shortcut.com/pricing" },
    { label: "Tracing pricing", href: "/pricing" },
  ],
};

import type { Comparison } from "./types";

export const huly: Comparison = {
  slug: "huly",
  competitor: "Huly",
  category: "open-source",
  title: "Focused Huly alternative",
  description:
    "Compare Huly with Tracing, an MIT-licensed tracker you can self-host with boards, triage, cycles, initiatives, views and insights.",
  summary: "Self-hosted planning as an alternative to Huly.",
  heading: "The focused Huly alternative",
  subheading:
    "Tracing is an MIT-licensed option for teams evaluating Huly who want to operate their own project tracker.",
  verdict:
    "Tracing is a self-hosted alternative to Huly for issue and project planning. It includes boards, triage, project plans, milestones, initiatives, roadmaps, cycles, insights and saved views. Budget for hosting, backups and maintenance; no managed Tracing subscription is offered.",
  facts: {
    license: "MIT, versus EPL-2.0 for Huly",
    hosting: "Self-host Tracing on infrastructure you control",
    sso: "Free on every Tracing build",
    pricing:
      "No license fee; infrastructure and operations are your responsibility",
  },
  rows: [
    { feature: "License", kaneo: "MIT", them: "EPL-2.0" },
    { feature: "Self-hostable", kaneo: true, them: true },
    {
      feature: "Scope",
      kaneo: "Project tracking",
      them: "All-in-one workspace",
    },
    {
      feature: "Install footprint",
      kaneo: "One container + Postgres",
      them: "Multi-service",
    },
    { feature: "Chat, docs, HR, CRM", kaneo: false, them: true },
    { feature: "Time tracking", kaneo: true, them: true },
    { feature: "Backlog planning", kaneo: true, them: true },
    {
      feature: "Cloud pricing",
      kaneo: "No managed hosting plan",
      them: "Free tier, then per user",
    },
  ],
  reasons: [
    {
      title: "One job, done properly",
      body: "Tracing is a tracker. There is no chat to migrate onto, no HR module to keep current, and nothing to disable before your team can start.",
    },
    {
      title: "Realistic to self-host",
      body: "A container and a database, with Docker Compose and a Helm chart. Huly's self-hosted platform has many more services to run and update.",
    },
    {
      title: "MIT licensing",
      body: "Tracing is MIT throughout, which keeps forking and commercial use uncomplicated compared with EPL-2.0's file-level copyleft.",
    },
  ],
  honestNote:
    "Huly is ambitious in a way that is genuinely appealing: virtual office, chat, documents, and tracking in one place, and it is free to self-host. If replacing several tools at once is the goal, Tracing is not trying to compete with that.",
  faq: [
    {
      question: "Is Huly open source?",
      answer:
        "Yes. The Huly platform is published under EPL-2.0 and can be self-hosted for free, alongside a hosted cloud with a free tier and paid plans.",
    },
    {
      question: "Huly or Tracing?",
      answer:
        "Huly if you want one workspace covering chat, documents, HR, and tracking. Tracing if you want a small, fast tracker you can run and understand, and you already have tools for the rest.",
    },
    {
      question: "How hard is each to self-host?",
      answer:
        "Tracing is one container plus PostgreSQL, with an official Helm chart. Huly's self-hosted deployment runs a considerably larger set of services and expects more operational attention.",
    },
    {
      question: "Does Tracing have chat or documents?",
      answer:
        "No. Tracing has task comments, notifications, and integrations with Slack, Discord, and Telegram. Documents and chat are deliberately out of scope.",
    },
  ],
  related: ["plane", "linear", "notion", "openproject"],
  verifiedOn: "2026-08-19",
  sources: [
    { label: "Huly pricing", href: "https://huly.io/pricing" },
    { label: "Tracing pricing", href: "/pricing" },
  ],
};

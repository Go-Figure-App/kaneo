import type { Comparison } from "./types";

export const basecamp: Comparison = {
  slug: "basecamp",
  competitor: "Basecamp",
  category: "saas",
  title: "Basecamp alternative for software teams",
  description:
    "Compare Basecamp with Tracing, an MIT-licensed tracker you can self-host with boards, triage, cycles, initiatives, views and insights.",
  summary: "Self-hosted planning as an alternative to Basecamp.",
  heading: "The Basecamp alternative for shipping software",
  subheading:
    "Basecamp is calm, opinionated, and organised around message boards and to-do lists. Tracing is calm and opinionated too, with a board and backlog built for shipping software.",
  verdict:
    "Tracing is a self-hosted alternative to Basecamp for issue and project planning. It includes boards, triage, project plans, milestones, initiatives, roadmaps, cycles, insights and saved views. Budget for hosting, backups and maintenance; no managed Tracing subscription is offered.",
  facts: {
    license: "MIT, versus a proprietary licence for Basecamp",
    hosting: "Self-host Tracing on infrastructure you control",
    sso: "Google, GitHub, Discord, or any OIDC provider, free on Tracing",
    pricing:
      "No license fee; infrastructure and operations are your responsibility",
  },
  rows: [
    { feature: "Open source (MIT)", kaneo: true, them: false },
    { feature: "Self-hostable", kaneo: true, them: false },
    { feature: "Own your data", kaneo: true, them: false },
    {
      feature: "Kanban board & backlog",
      kaneo: true,
      them: "Card table, to-dos",
    },
    { feature: "Message boards & chat", kaneo: false, them: true },
    { feature: "Time tracking", kaneo: true, them: "Higher tiers" },
    { feature: "Pricing model", kaneo: "Free or per user", them: "Flat rate" },
    {
      feature: "Cloud pricing",
      kaneo: "No managed hosting plan",
      them: "From $25/mo flat",
    },
  ],
  reasons: [
    {
      title: "Made for shipping software",
      body: "Backlog, workflow columns, priorities, task relations, and time entries. Basecamp's to-do lists and card table are deliberately looser than that.",
    },
    {
      title: "Runs on your infrastructure",
      body: "Basecamp has been hosted-only since Basecamp 3. Tracing installs with Docker and PostgreSQL on any box you control, under the MIT license.",
    },
    {
      title: "Free when you host it",
      body: "A self-hosted Tracing instance costs you a server. Basecamp's flat rate is fair at scale but starts at $25 a month whether you are two people or twenty.",
    },
  ],
  honestNote:
    "Basecamp's flat pricing and its all-in-one approach to client work, messages, docs, and check-ins are hard to beat if that is how your company communicates. Tracing has no message boards, no campfire chat, and no client access. If Basecamp is your intranet, keep it.",
  faq: [
    {
      question: "Can Basecamp be self-hosted?",
      answer:
        "Not the current version. Basecamp has been a hosted product since Basecamp 3, and the older self-installable Basecamp Classic is long retired. Once On-Premise was 37signals' answer for self-hosting Campfire and similar apps, not for Basecamp itself.",
    },
    {
      question: "What does Basecamp cost?",
      answer:
        "Basecamp is flat-rate rather than per user: a free tier, then Freelancer at $25 a month, Studio at $59, Pro at $100, and Unlimited at $300 a month billed annually, with everyone on the account included.",
    },
    {
      question: "Is there an open-source Basecamp alternative?",
      answer:
        "Tracing, Leantime, OpenProject, and Taiga are the usual open-source options. Tracing is the closest if what you want is a fast board and backlog. Leantime is closer if you want goals and light client-facing structure.",
    },
    {
      question: "Does Tracing have Basecamp's message boards?",
      answer:
        "No. Tracing has task comments, notifications, and integrations with Slack, Discord, and Telegram, but no standalone message board or group chat. It assumes your team already talks somewhere else.",
    },
  ],
  related: ["trello", "asana", "leantime", "notion"],
  verifiedOn: "2026-08-19",
  sources: [
    { label: "Basecamp pricing", href: "https://basecamp.com/pricing" },
    { label: "Tracing pricing", href: "/pricing" },
  ],
};

import type { Comparison } from "./types";

export const monday: Comparison = {
  slug: "monday",
  competitor: "monday.com",
  category: "saas",
  title: "monday.com alternative with no seat minimums",
  description:
    "Compare monday.com with Tracing, an MIT-licensed tracker you can self-host with boards, triage, cycles, initiatives, views and insights.",
  summary:
    "No seat blocks, no three-board free tier, and every feature on every plan.",
  heading: "The monday.com alternative with no seat minimums",
  subheading:
    "Tracing is an MIT-licensed option for teams evaluating monday.com who want to operate their own project tracker.",
  verdict:
    "Tracing is a self-hosted alternative to monday.com for issue and project planning. It includes boards, triage, project plans, milestones, initiatives, roadmaps, cycles, insights and saved views. Budget for hosting, backups and maintenance; no managed Tracing subscription is offered.",
  facts: {
    license: "MIT, versus a proprietary licence for monday.com",
    hosting: "Self-host Tracing on infrastructure you control",
    sso: "Free on every Tracing build, Enterprise tier on monday.com",
    pricing:
      "No license fee; infrastructure and operations are your responsibility",
  },
  rows: [
    { feature: "Open source (MIT)", kaneo: true, them: false },
    { feature: "Self-hostable", kaneo: true, them: false },
    { feature: "Own your data", kaneo: true, them: false },
    { feature: "Seat minimums", kaneo: "None", them: "Seats sold in blocks" },
    {
      feature: "Free tier",
      kaneo: "Unlimited, self-hosted",
      them: "2 seats, 3 boards",
    },
    { feature: "SSO included", kaneo: "Free", them: "Enterprise" },
    { feature: "Boards & workflows", kaneo: true, them: true },
    {
      feature: "Cloud pricing",
      kaneo: "No managed hosting plan",
      them: "Per seat, in blocks",
    },
  ],
  reasons: [
    {
      title: "You pay for the people you have",
      body: "Tracing has no license or per-seat fee. You operate the application, database, storage, backups and updates on infrastructure you choose; this fork does not offer a managed hosting plan.",
    },
    {
      title: "No feature ladder",
      body: "Automations, integrations, and single sign-on sit on different monday.com tiers. Tracing has one product: whichever way you run it, you get all of it.",
    },
    {
      title: "Simple on purpose",
      body: "Boards, backlog, Gantt and calendar views, custom fields, workflow rules, and time tracking. Start with tasks and dates, then add the fields and workflow columns your project needs.",
    },
  ],
  honestNote:
    "monday.com is a work OS, not just a tracker. If you want dashboards, forms, CRM boards, and a marketplace of apps in one place, and you are happy paying per seat for it, it does far more than Tracing. Tracing is for teams who want a fast project tracker they can own.",
  faq: [
    {
      question: "Is there an open-source monday.com alternative?",
      answer:
        "Yes. Tracing, OpenProject, Leantime, and Plane are all open source and self-hostable. Tracing is the lightest of them to run: one container plus PostgreSQL, MIT licensed, with SSO included.",
    },
    {
      question: "Can monday.com be self-hosted?",
      answer:
        "No. monday.com is cloud-only SaaS. Its Enterprise tier adds security and compliance controls, but there is no version you can install on your own servers.",
    },
    {
      question: "What does monday.com's free plan include?",
      answer:
        "The free plan is capped at 2 seats and 3 boards, with a limited set of views. Paid plans are per seat with minimum seat counts, and SSO arrives at the Enterprise tier.",
    },
    {
      question: "Does Tracing have automations?",
      answer:
        "Tracing has workflow rules per project that map integration events to target columns, plus outgoing webhooks, GitHub, GitLab, and Gitea integrations, and notifications in Slack, Discord, Telegram, and Mattermost. It does not have a general automation recipe builder.",
    },
  ],
  related: ["clickup", "asana", "wrike", "leantime"],
  verifiedOn: "2026-08-19",
  sources: [
    { label: "monday.com pricing", href: "https://monday.com/pricing" },
    { label: "Tracing pricing", href: "/pricing" },
  ],
};

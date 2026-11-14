import type { Comparison } from "./types";

export const asana: Comparison = {
  slug: "asana",
  competitor: "Asana",
  category: "saas",
  title: "Simpler Asana alternative",
  description:
    "Compare Asana with Tracing, an MIT-licensed tracker you can self-host with boards, triage, cycles, initiatives, views and insights.",
  summary: "No two-user free tier, and every feature on every Tracing plan.",
  heading: "The simpler Asana alternative",
  subheading:
    "Tracing is an MIT-licensed option for teams evaluating Asana who want to operate their own project tracker.",
  verdict:
    "Tracing is a self-hosted alternative to Asana for issue and project planning. It includes boards, triage, project plans, milestones, initiatives, roadmaps, cycles, insights and saved views. Budget for hosting, backups and maintenance; no managed Tracing subscription is offered.",
  facts: {
    license: "MIT, versus a proprietary licence for Asana",
    hosting: "Self-host Tracing on infrastructure you control",
    sso: "Free on every Tracing build, Enterprise tier on Asana",
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
      them: "Up to 2 users",
    },
    { feature: "SSO included", kaneo: "Free", them: "Enterprise" },
    { feature: "Time tracking", kaneo: true, them: "Paid tiers" },
    { feature: "Learning curve", kaneo: "Minutes", them: "Moderate" },
    {
      feature: "Cloud pricing",
      kaneo: "No managed hosting plan",
      them: "From $10.99/user/mo",
    },
  ],
  reasons: [
    {
      title: "The free tier is the whole product",
      body: "Self-hosted Tracing has no seat cap and no feature gates. Asana's Personal plan tops out at two users and holds back timeline, forms, and automations.",
    },
    {
      title: "Single sign-on without a sales call",
      body: "Connect Google, GitHub, Discord, or any OIDC provider on any Tracing build. Asana puts SAML behind Enterprise, which is quote-only pricing.",
    },
    {
      title: "Work, not work management",
      body: "Tracing brings boards, backlog, Gantt and calendar planning, custom fields, workflow rules, and time tracking together. Teams can organise tasks and schedules without setting up a portfolio reporting layer.",
    },
  ],
  honestNote:
    "Asana is genuinely strong at cross-team coordination: portfolios, goals, workload balancing, and approval flows for a marketing or operations org. If a program manager needs to see fifty projects roll up into one status view, Asana does that and Tracing does not.",
  faq: [
    {
      question: "Is Asana open source?",
      answer:
        "No. Asana is proprietary software under a commercial licence, sold only as a hosted service. Tracing is an open-source alternative under the MIT license that you can run on your own server.",
    },
    {
      question: "Is there an open-source alternative to Asana?",
      answer:
        "Yes. Tracing is MIT licensed and free to self-host with unlimited users. Other open-source options include OpenProject, Plane, Taiga, and Leantime. None of them replicate Asana's portfolio and goals layer, which is usually the point of switching.",
    },
    {
      question: "Can Asana be self-hosted?",
      answer:
        "No. Asana is a hosted SaaS product with no on-premise edition. If your requirement is keeping project data on infrastructure you control, you need a different tool.",
    },
    {
      question: "How many users does Asana's free plan allow?",
      answer:
        "Asana's Personal plan is limited to 2 users. Paid plans start at $10.99 per user a month billed annually for Starter and $24.99 for Advanced, with SAML SSO first appearing on Enterprise.",
    },
    {
      question: "Does Tracing have time tracking like Asana?",
      answer:
        "Yes. Time entries are built into Tracing tasks on every build, including the free self-hosted one. In Asana, time tracking is a paid-tier feature.",
    },
  ],
  related: ["clickup", "monday", "jira", "notion"],
  verifiedOn: "2026-08-19",
  sources: [
    { label: "Asana pricing", href: "https://asana.com/pricing" },
    { label: "Tracing pricing", href: "/pricing" },
  ],
};

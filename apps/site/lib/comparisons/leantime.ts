import type { Comparison } from "./types";

export const leantime: Comparison = {
  slug: "leantime",
  competitor: "Leantime",
  category: "open-source",
  title: "Focused Leantime alternative",
  description:
    "Compare Leantime with Tracing, an MIT-licensed tracker you can self-host with boards, triage, cycles, initiatives, views and insights.",
  summary: "The tracker underneath, without the goals and strategy layer.",
  heading: "The focused Leantime alternative",
  subheading:
    "Tracing is an MIT-licensed option for teams evaluating Leantime who want to operate their own project tracker.",
  verdict:
    "Tracing is a self-hosted alternative to Leantime for issue and project planning. It includes boards, triage, project plans, milestones, initiatives, roadmaps, cycles, insights and saved views. Budget for hosting, backups and maintenance; no managed Tracing subscription is offered.",
  facts: {
    license: "MIT, versus AGPLv3 for the Leantime community edition",
    hosting: "Self-host Tracing on infrastructure you control",
    sso: "Free on every Tracing build",
    pricing:
      "No license fee; infrastructure and operations are your responsibility",
  },
  rows: [
    { feature: "License", kaneo: "MIT", them: "AGPLv3" },
    { feature: "Self-hostable", kaneo: true, them: true },
    { feature: "Free to self-host", kaneo: true, them: true },
    { feature: "Goals & strategy boards", kaneo: false, them: true },
    { feature: "Backlog planning", kaneo: true, them: true },
    { feature: "Time tracking", kaneo: true, them: true },
    { feature: "Stack", kaneo: "Node + PostgreSQL", them: "PHP + MySQL" },
    {
      feature: "Cloud pricing",
      kaneo: "No managed hosting plan",
      them: "Per user",
    },
  ],
  reasons: [
    {
      title: "A tracker, not a framework",
      body: "Leantime asks you to define goals, ideas, and research before the work. Tracing assumes you know what needs doing and want somewhere to do it.",
    },
    {
      title: "Permissive licence",
      body: "MIT rather than AGPLv3, so forking Tracing or building a product around it stays simple.",
    },
    {
      title: "Modern stack, small footprint",
      body: "Tracing is one container plus PostgreSQL with realtime board updates, an official Helm chart, and a documented public API.",
    },
  ],
  honestNote:
    "Leantime is thoughtfully designed for people who do not think in tickets, and it was built with ADHD, autism, and dyslexia explicitly in mind. Its goals, ideas, and retrospective boards give small teams a structure Tracing simply does not have. If that framing is what your team needs, Leantime is the better tool.",
  faq: [
    {
      question: "Is Leantime free?",
      answer:
        "The self-hosted community edition is free and open source under AGPLv3, and matches the features of the hosted Core plan. Leantime's cloud is priced per user.",
    },
    {
      question: "Leantime or Tracing?",
      answer:
        "Leantime if you want goal setting, idea boards, and retrospectives around your tasks. Tracing if you want a fast board and backlog with roles, time tracking, and integrations, under a permissive licence.",
    },
    {
      question: "What does Tracing run on?",
      answer:
        "A single container running the Hono API and React front end, plus PostgreSQL. Redis is optional and only needed to coordinate realtime delivery across several API instances.",
    },
    {
      question: "Does Tracing have retrospectives or goal tracking?",
      answer:
        "No. Tracing has projects, boards, backlog, labels, priorities, task relations, comments, and time entries. Goals and retrospectives are outside its scope by design.",
    },
  ],
  related: ["openproject", "basecamp", "vikunja", "monday"],
  verifiedOn: "2026-08-19",
  sources: [
    { label: "Leantime pricing", href: "https://leantime.io/pricing/" },
    { label: "Tracing pricing", href: "/pricing" },
  ],
};

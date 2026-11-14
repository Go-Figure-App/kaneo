import type { Comparison } from "./types";

export const openproject: Comparison = {
  slug: "openproject",
  competitor: "OpenProject",
  category: "open-source",
  title: "Lightweight OpenProject alternative",
  description:
    "Compare OpenProject with Tracing, an MIT-licensed tracker you can self-host with boards, triage, cycles, initiatives, views and insights.",
  summary:
    "One container instead of a platform, with nothing held back for Enterprise.",
  heading: "The lightweight OpenProject alternative",
  subheading:
    "OpenProject is a serious, mature platform, and it asks for a serious install. Tracing is one container and a database, MIT licensed, with single sign-on in the free build.",
  verdict:
    "Tracing is a self-hosted alternative to OpenProject for issue and project planning. It includes boards, triage, project plans, milestones, initiatives, roadmaps, cycles, insights and saved views. Budget for hosting, backups and maintenance; no managed Tracing subscription is offered.",
  facts: {
    license: "MIT, versus GPLv3 for the OpenProject Community edition",
    hosting: "Self-host Tracing on infrastructure you control",
    sso: "Free on every Tracing build, Enterprise add-on for OpenProject",
    pricing:
      "No license fee; infrastructure and operations are your responsibility",
  },
  rows: [
    { feature: "License", kaneo: "MIT", them: "GPLv3 (Community)" },
    { feature: "Self-hostable", kaneo: true, them: true },
    { feature: "SSO / OIDC in free build", kaneo: true, them: false },
    { feature: "Paid edition gates features", kaneo: false, them: true },
    { feature: "Gantt charts", kaneo: true, them: true },
    { feature: "Time & cost reporting", kaneo: "Time tracking", them: true },
    { feature: "Setup", kaneo: "Minutes", them: "Involved" },
    { feature: "Cloud minimum users", kaneo: "1", them: "25" },
  ],
  reasons: [
    {
      title: "Nothing is held back for Enterprise",
      body: "OpenProject reserves single sign-on, custom themes, and other capabilities for its Enterprise add-on. Tracing has one edition, and single sign-on is part of it.",
    },
    {
      title: "Small enough to run yourself",
      body: "Tracing is one container plus PostgreSQL, deployable with Docker Compose or Helm. OpenProject is a substantially larger Rails application with more moving parts to keep healthy.",
    },
    {
      title: "MIT, not copyleft",
      body: "If you plan to fork Tracing or build something on top of it commercially, MIT keeps that simple. GPLv3 imposes conditions that some companies would rather avoid.",
    },
  ],
  honestNote:
    "Both tools offer Gantt views. OpenProject goes further with baseline comparisons, budgets, cost reporting, work-package hierarchies, and BIM support. Those are reasons to choose it when project controls go beyond scheduling tasks. Tracing combines Gantt and calendar planning with boards, custom fields, and time tracking in a smaller setup.",
  faq: [
    {
      question: "Is OpenProject completely free?",
      answer:
        "The Community edition is free and open source under GPLv3, but single sign-on, custom themes, and several other features belong to the Enterprise add-on. Enterprise cloud plans start at 25 users.",
    },
    {
      question: "What is a simpler alternative to OpenProject?",
      answer:
        "Tracing, Vikunja, and Taiga are all lighter to run. Tracing is MIT licensed, includes SSO for free, and is a single container plus a PostgreSQL database.",
    },
    {
      question: "Does Tracing have Gantt charts?",
      answer:
        "Yes. Tracing has a Gantt view for tasks with start and due dates, alongside calendar, board, and list views. It does not have baseline comparisons, budgets, or cost reporting. If those are central to your work, consider OpenProject.",
    },
    {
      question: "Can I migrate from OpenProject to Tracing?",
      answer:
        "There is no dedicated importer yet. OpenProject has a full REST API and Tracing has a documented public API and per-project JSON import, so a scripted migration is realistic. Open an issue on GitHub if you want a supported path.",
    },
  ],
  related: ["redmine", "jira", "taiga", "plane"],
  verifiedOn: "2026-08-19",
  sources: [
    {
      label: "OpenProject pricing",
      href: "https://www.openproject.org/pricing/",
    },
    { label: "Tracing pricing", href: "/pricing" },
  ],
};

import type { Comparison } from "./types";

export const wekan: Comparison = {
  slug: "wekan",
  competitor: "WeKan",
  category: "open-source",
  title: "WeKan alternative on a modern stack",
  description:
    "Compare WeKan with Tracing, an MIT-licensed tracker you can self-host with boards, triage, cycles, initiatives, views and insights.",
  summary: "Self-hosted planning as an alternative to WeKan.",
  heading: "The WeKan alternative on a modern stack",
  subheading:
    "Tracing is an MIT-licensed option for teams evaluating WeKan who want to operate their own project tracker.",
  verdict:
    "Tracing is a self-hosted alternative to WeKan for issue and project planning. It includes boards, triage, project plans, milestones, initiatives, roadmaps, cycles, insights and saved views. Budget for hosting, backups and maintenance; no managed Tracing subscription is offered.",
  facts: {
    license: "MIT for both",
    hosting: "Self-host Tracing on infrastructure you control",
    sso: "Free on both, through OIDC",
    pricing:
      "No license fee; infrastructure and operations are your responsibility",
  },
  rows: [
    { feature: "License", kaneo: "MIT", them: "MIT" },
    { feature: "Self-hostable", kaneo: true, them: true },
    { feature: "Database", kaneo: "PostgreSQL", them: "MongoDB" },
    { feature: "Kanban boards", kaneo: true, them: true },
    { feature: "Backlog planning", kaneo: true, them: false },
    { feature: "Workspace roles", kaneo: true, them: "Board permissions" },
    { feature: "Time tracking", kaneo: true, them: false },
    { feature: "Official cloud", kaneo: false, them: false },
  ],
  reasons: [
    {
      title: "A stack your ops team already knows",
      body: "PostgreSQL, one container, Docker Compose or Helm. Backups and upgrades look like everything else you run.",
    },
    {
      title: "Structure beyond the board",
      body: "Workspaces, projects, a backlog, workflow rules, roles, and time entries, so planning does not have to happen in a spreadsheet next to the board.",
    },
    {
      title: "Same licence, no compromise",
      body: "Both projects are MIT. Choosing Tracing does not cost you any of the freedom WeKan gives you.",
    },
  ],
  honestNote:
    "WeKan has been around far longer, supports a long list of deployment targets including Snap and Sandstorm, and has a card model with swimlanes that some teams specifically want. If it is running well for you, it owes you nothing.",
  faq: [
    {
      question: "Is WeKan still maintained?",
      answer:
        "Yes, WeKan is actively developed and MIT licensed, with frequent releases. Its Meteor and MongoDB stack is the main practical difference from newer tools.",
    },
    {
      question: "WeKan or Tracing?",
      answer:
        "Pick WeKan if you want a pure Trello-style board with swimlanes and the widest range of install methods. Pick Tracing if you want backlog planning, workspace roles, time tracking, and a PostgreSQL stack and want to operate it yourself.",
    },
    {
      question: "Do both support single sign-on?",
      answer:
        "Yes. WeKan supports OAuth2 and OIDC providers, and Tracing supports Google, GitHub, Discord, and any OIDC provider on every build at no cost.",
    },
    {
      question: "Can I migrate WeKan boards to Tracing?",
      answer:
        "There is no dedicated importer. WeKan can export boards to JSON and Tracing has a per-project JSON import plus a documented API, so a scripted move is realistic.",
    },
  ],
  related: ["planka", "kanboard", "trello", "focalboard"],
  verifiedOn: "2026-08-19",
  sources: [
    { label: "WeKan", href: "https://wekan.github.io/" },
    { label: "Tracing pricing", href: "/pricing" },
  ],
};

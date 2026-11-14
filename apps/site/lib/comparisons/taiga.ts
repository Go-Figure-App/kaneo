import type { Comparison } from "./types";

export const taiga: Comparison = {
  slug: "taiga",
  competitor: "Taiga",
  category: "open-source",
  title: "Simpler Taiga alternative",
  description:
    "Compare Taiga with Tracing, an MIT-licensed tracker you can self-host with boards, triage, cycles, initiatives, views and insights.",
  summary: "A board and backlog without adopting Scrum first.",
  heading: "The simpler Taiga alternative",
  subheading:
    "Taiga is built around Scrum and Kanban done properly, sprints, story points, and all. Tracing is for teams who want to plan and ship without adopting a methodology first.",
  verdict:
    "Tracing is a self-hosted alternative to Taiga for issue and project planning. It includes boards, triage, project plans, milestones, initiatives, roadmaps, cycles, insights and saved views. Budget for hosting, backups and maintenance; no managed Tracing subscription is offered.",
  facts: {
    license: "MIT, versus MPL-2.0 for Taiga",
    hosting: "Self-host Tracing on infrastructure you control",
    sso: "Free on every Tracing build",
    pricing:
      "No license fee; infrastructure and operations are your responsibility",
  },
  rows: [
    { feature: "License", kaneo: "MIT", them: "MPL-2.0" },
    { feature: "Self-hostable", kaneo: true, them: true },
    { feature: "Free to self-host", kaneo: true, them: true },
    {
      feature: "Iterations & point estimates",
      kaneo: "Cycles and estimates",
      them: "Sprints and story points",
    },
    { feature: "Backlog planning", kaneo: true, them: true },
    { feature: "Time tracking", kaneo: true, them: false },
    {
      feature: "Install footprint",
      kaneo: "One container + Postgres",
      them: "Multi-service",
    },
    {
      feature: "Learning curve",
      kaneo: "Minutes",
      them: "Agile concepts first",
    },
  ],
  reasons: [
    {
      title: "No methodology tax",
      body: "Tracing does not ask you to size stories or open a sprint before work can move. Columns, priorities, and a backlog are enough for most teams.",
    },
    {
      title: "Smaller to run",
      body: "Taiga's self-hosted stack is several services. Tracing is one container plus PostgreSQL, with a Helm chart for Kubernetes.",
    },
    {
      title: "Time tracking included",
      body: "Log time against tasks in the free build. Taiga leaves time tracking to plugins and external tools.",
    },
  ],
  honestNote:
    "Taiga provides Scrum workflows and an epics model. Tracing provides workspace cycles, estimates and burndown alongside project and initiative planning. Compare the two models against the workflow your team actually uses.",
  faq: [
    {
      question: "Is Taiga free and open source?",
      answer:
        "Yes. Taiga is open source under MPL-2.0 and free to self-host with no user limits. Taiga also offers a cloud with a free tier and paid support options.",
    },
    {
      question: "Taiga or Tracing?",
      answer:
        "Compare Taiga’s Scrum model with Tracing’s workspace cycles, estimates, burndown and project planning. Tracing also includes boards, backlog, time tracking and operator-configured single sign-on.",
    },
    {
      question: "Does Tracing support sprints?",
      answer:
        "Yes, through cycles when enabled by the operator: dated iterations with task assignment, numeric point estimates and a burndown chart for each cycle. Workspace settings control the estimate scale.",
    },
    {
      question: "Which is easier to self-host?",
      answer:
        "Tracing. It is a single container plus PostgreSQL, deployable with Docker Compose or the official Helm chart. Taiga's standard deployment runs several coordinated services.",
    },
  ],
  related: ["openproject", "jira", "redmine", "plane"],
  verifiedOn: "2026-08-19",
  sources: [
    { label: "Taiga", href: "https://taiga.io/" },
    { label: "Tracing pricing", href: "/pricing" },
  ],
};

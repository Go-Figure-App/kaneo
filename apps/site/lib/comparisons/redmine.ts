import type { Comparison } from "./types";

export const redmine: Comparison = {
  slug: "redmine",
  competitor: "Redmine",
  category: "open-source",
  title: "Modern Redmine alternative",
  description:
    "Compare Redmine with Tracing, an MIT-licensed tracker you can self-host with boards, triage, cycles, initiatives, views and insights.",
  summary: "Self-hosted planning as an alternative to Redmine.",
  heading: "The modern Redmine alternative",
  subheading:
    "Tracing is an MIT-licensed option for teams evaluating Redmine who want to operate their own project tracker.",
  verdict:
    "Tracing is a self-hosted alternative to Redmine for issue and project planning. It includes boards, triage, project plans, milestones, initiatives, roadmaps, cycles, insights and saved views. Budget for hosting, backups and maintenance; no managed Tracing subscription is offered.",
  facts: {
    license: "MIT, versus GPLv2 for Redmine",
    hosting: "Self-host Tracing on infrastructure you control",
    sso: "Built in on Tracing, LDAP or plugins on Redmine",
    pricing:
      "No license fee; infrastructure and operations are your responsibility",
  },
  rows: [
    { feature: "License", kaneo: "MIT", them: "GPLv2" },
    { feature: "Self-hostable", kaneo: true, them: true },
    { feature: "Kanban board built in", kaneo: true, them: "Plugin" },
    {
      feature: "OIDC single sign-on",
      kaneo: "Built in",
      them: "Plugin or LDAP",
    },
    { feature: "Realtime updates", kaneo: true, them: false },
    { feature: "Time tracking", kaneo: true, them: true },
    { feature: "Official cloud", kaneo: true, them: false },
    { feature: "Interface", kaneo: "Current", them: "Dated" },
  ],
  reasons: [
    {
      title: "No plugin archaeology",
      body: "A usable Redmine often means a stack of community plugins, each pinned to a Redmine version. Tracing's boards, workflows, and SSO are part of the product and upgrade with it.",
    },
    {
      title: "People will actually open it",
      body: "Redmine's interface is functional and unloved. Tracing is a fast single-page app with realtime board updates, which matters when adoption is the hard part.",
    },
    {
      title: "A cloud option when you want one",
      body: "Redmine has no first-party hosting. Tracing gives you the same MIT-licensed software either self-hosted or managed from $4 a month.",
    },
  ],
  honestNote:
    "Redmine is battle-tested, endlessly extensible, and still maintained, with an ecosystem covering almost anything through plugins. If you already run it, know its quirks, and depend on that ecosystem, there is no urgent reason to move. Tracing is for teams starting fresh who want less to maintain.",
  faq: [
    {
      question: "Is Redmine still maintained?",
      answer:
        "Yes. Redmine is still actively developed and released under GPLv2, but its core interface and workflow model have changed little in years, and much of the modern functionality lives in third-party plugins.",
    },
    {
      question: "What is the best modern Redmine alternative?",
      answer:
        "Tracing if you want something small, modern, and MIT licensed. OpenProject if you want a Redmine-descended platform with Gantt charts and enterprise support. Plane or Huly if you want a Linear-style interface.",
    },
    {
      question: "Does Tracing support LDAP?",
      answer:
        "Tracing authenticates through Google, GitHub, Discord, or any OIDC provider, which covers most directories through an identity provider such as Keycloak, Authentik, or Entra ID. There is no direct LDAP bind.",
    },
    {
      question: "Can I migrate Redmine issues to Tracing?",
      answer:
        "There is no dedicated importer. Redmine has a REST API and Tracing has a public API plus per-project JSON import, so a scripted migration is straightforward for someone comfortable with either API.",
    },
  ],
  related: ["openproject", "jira", "kanboard", "taiga"],
  verifiedOn: "2026-08-19",
  sources: [
    { label: "Redmine", href: "https://www.redmine.org/" },
    { label: "Tracing pricing", href: "/pricing" },
  ],
};

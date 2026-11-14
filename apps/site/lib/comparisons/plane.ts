import type { Comparison } from "./types";

export const plane: Comparison = {
  slug: "plane",
  competitor: "Plane",
  category: "open-source",
  title: "Lighter Plane alternative",
  description:
    "Compare Plane with Tracing, an MIT-licensed tracker you can self-host with boards, triage, cycles, initiatives, views and insights.",
  summary: "Self-hosted planning as an alternative to Plane.",
  heading: "The lighter Plane alternative",
  subheading:
    "Tracing is an MIT-licensed option for teams evaluating Plane who want to operate their own project tracker.",
  verdict:
    "Tracing is a self-hosted alternative to Plane for issue and project planning. It includes boards, triage, project plans, milestones, initiatives, roadmaps, cycles, insights and saved views. Budget for hosting, backups and maintenance; no managed Tracing subscription is offered.",
  facts: {
    license: "MIT, versus AGPL-3.0 for the Plane Community edition",
    hosting: "Self-host Tracing on infrastructure you control",
    sso: "Free on every Tracing build, Pro tier and above on Plane",
    pricing:
      "No license fee; infrastructure and operations are your responsibility",
  },
  rows: [
    { feature: "License", kaneo: "MIT", them: "AGPL-3.0 (Community)" },
    { feature: "Self-hostable", kaneo: true, them: true },
    { feature: "Separate commercial edition", kaneo: false, them: true },
    { feature: "SSO in free build", kaneo: true, them: false },
    {
      feature: "Install footprint",
      kaneo: "One container + Postgres",
      them: "Multi-service",
    },
    { feature: "Cycles & modules", kaneo: false, them: true },
    { feature: "Time tracking", kaneo: true, them: "Paid tiers" },
    {
      feature: "Cloud pricing",
      kaneo: "No managed hosting plan",
      them: "From $6/seat/mo",
    },
  ],
  reasons: [
    {
      title: "One edition, no upgrade path to buy",
      body: "Plane splits into Community, Commercial, and Airgapped editions. Tracing has one build, and everything in it is yours under MIT.",
    },
    {
      title: "Less to operate",
      body: "Tracing is a container and a database. Plane's self-hosted stack has more services to run, monitor, and upgrade.",
    },
    {
      title: "Permissive licensing",
      body: "MIT rather than AGPL matters if you intend to modify Tracing and offer it as part of a service. It removes the question entirely.",
    },
  ],
  migration: {
    body: "Tracing imports projects from Plane Cloud or a self-hosted Plane from the app: states, work items with their keys, priorities, dates, labels, comments, and sub-issues. Plane is only read, never changed.",
    href: "https://github.com/Go-Figure-App/tracing/blob/main/apps/docs/core/migrations/from-plane.mdx",
    linkText: "Read the import guide",
  },
  honestNote:
    "Plane is the more feature-complete tracker: cycles, modules, intake, pages, and a polished interface, backed by a well-funded team shipping quickly. If you want a Linear-shaped open-source product and do not mind AGPL or a bigger install, Plane is an excellent choice.",
  faq: [
    {
      question: "Is Plane fully open source?",
      answer:
        "The Community edition is open source under AGPL-3.0 and free to self-host with no user limits. Plane also sells Commercial and Airgapped editions, and its cloud plans put single sign-on and advanced controls on paid tiers.",
    },
    {
      question: "Plane or Tracing for a self-hosted team?",
      answer:
        "Plane if you want cycles, modules, and a broader feature set and can run a larger stack. Tracing if you want MIT licensing, SSO in the free build, and the smallest install that still handles a team.",
    },
    {
      question: "Does AGPL matter for self-hosting?",
      answer:
        "For internal use, generally not. It matters if you modify the code and offer it to others over a network, where AGPL requires you to publish your changes. MIT has no such requirement.",
    },
    {
      question: "Can I migrate from Plane to Tracing?",
      answer:
        "Yes. Tracing imports projects from Plane Cloud or a self-hosted Plane from the app with a Plane personal access token. States, work items with their keys, priorities, dates, labels, comments, and sub-issues carry over. Cycles, modules, and attachments do not.",
    },
  ],
  related: ["linear", "huly", "jira", "openproject"],
  verifiedOn: "2026-08-19",
  sources: [
    { label: "Plane pricing", href: "https://plane.so/pricing" },
    { label: "Tracing pricing", href: "/pricing" },
  ],
};

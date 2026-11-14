import type { Comparison } from "./types";

export const linear: Comparison = {
  slug: "linear",
  competitor: "Linear",
  category: "saas",
  title: "Linear alternative: Tracing vs Linear",
  description:
    "Compare Linear with Tracing, an MIT-licensed tracker you can self-host with boards, triage, cycles, initiatives, views and insights.",
  summary: "Self-hosted planning as an alternative to Linear.",
  heading: "The fast, focused Linear alternative",
  subheading:
    "Tracing is an MIT-licensed option for teams evaluating Linear who want to operate their own project tracker.",
  verdict:
    "Tracing is a self-hosted alternative to Linear for issue and project planning. It includes boards, triage, project plans, milestones, initiatives, roadmaps, cycles, insights and saved views. Budget for hosting, backups and maintenance; no managed Tracing subscription is offered.",
  facts: {
    license: "MIT, versus a proprietary licence for Linear",
    hosting: "Self-host Tracing on infrastructure you control",
    sso: "Free on every Tracing build, paid plans on Linear",
    pricing:
      "No license fee; infrastructure and operations are your responsibility",
  },
  rows: [
    { feature: "Open source (MIT)", kaneo: true, them: false },
    { feature: "Self-hostable", kaneo: true, them: false },
    { feature: "Own your data", kaneo: true, them: false },
    { feature: "Fast, focused UI", kaneo: true, them: true },
    { feature: "Free to self-host", kaneo: true, them: false },
    { feature: "SSO included", kaneo: "Free", them: "Paid plans" },
    {
      feature: "Cloud pricing",
      kaneo: "No managed hosting plan",
      them: "Per user",
    },
  ],
  reasons: [
    {
      title: "Clean and focused",
      body: "Tracing is built around the same idea Linear popularized: a fast, uncluttered way to plan and execute, without the SaaS lock-in.",
    },
    {
      title: "Open and self-hostable",
      body: "Run Tracing on your own infrastructure under the MIT license, keep your data in-house, and never depend on a vendor staying online.",
    },
    {
      title: "Honest pricing",
      body: "Tracing has no license or per-seat fee. You operate the application, database, storage, backups and updates on infrastructure you choose; this fork does not offer a managed hosting plan.",
    },
  ],
  migration: {
    body: "With planning import enabled, Tracing imports Linear projects, issues, estimates, milestones, cycles, initiatives and planning metadata through a read-only connection. Without that feature, the base importer remains available. Review the import report and verify the destination before retiring Linear.",
    href: "https://github.com/Go-Figure-App/tracing/blob/main/apps/docs/core/migrations/from-linear.mdx",
    linkText: "Read the import guide",
  },
  honestNote:
    "Linear sets the bar for polish, speed, and deep product-team features like cycles and triage. If you're committed to cloud SaaS and want that specific, highly-refined workflow, it's excellent. Tracing is for teams who want a clean experience they can actually own.",
  faq: [
    {
      question: "Can Linear be self-hosted?",
      answer:
        "No. Linear is a closed-source SaaS product with no self-hosted or on-premise edition. If running the tracker on your own infrastructure is a requirement, you need an open-source tool such as Tracing, Plane, or Huly.",
    },
    {
      question: "What is the best open-source Linear alternative?",
      answer:
        "Tracing, Plane, and Huly are the three usually named. Tracing is MIT licensed and the smallest of the three to run and understand. Plane is AGPL and larger. Huly is EPL-2.0 and bundles chat, documents, and HR alongside tracking.",
    },
    {
      question: "Does Tracing have keyboard shortcuts and a fast UI?",
      answer:
        "Yes. Tracing is built as a single-page React app with realtime updates over WebSockets, so boards stay in sync without reloads. It is deliberately smaller in scope than Linear, which is what keeps it quick.",
    },
    {
      question: "How does Tracing pricing compare to Linear?",
      answer:
        "Tracing has no license or per-seat fee. You operate the application, database, storage, backups and updates on infrastructure you choose; this fork does not offer a managed hosting plan. Consult Linear's current pricing and terms separately.",
    },
  ],
  related: ["jira", "plane", "huly", "shortcut"],
  verifiedOn: "2026-08-19",
  sources: [
    { label: "Linear pricing", href: "https://linear.app/pricing" },
    { label: "Tracing pricing", href: "/pricing" },
  ],
};

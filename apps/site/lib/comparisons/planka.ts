import type { Comparison } from "./types";

export const planka: Comparison = {
  slug: "planka",
  competitor: "PLANKA",
  category: "open-source",
  title: "PLANKA alternative with SSO included",
  description:
    "Compare PLANKA with Tracing, an MIT-licensed tracker you can self-host with boards, triage, cycles, initiatives, views and insights.",
  summary: "Self-hosted planning as an alternative to PLANKA.",
  heading: "The PLANKA alternative with SSO included",
  subheading:
    "Tracing is an MIT-licensed option for teams evaluating PLANKA who want to operate their own project tracker.",
  verdict:
    "Tracing is a self-hosted alternative to PLANKA for issue and project planning. It includes boards, triage, project plans, milestones, initiatives, roadmaps, cycles, insights and saved views. Budget for hosting, backups and maintenance; no managed Tracing subscription is offered.",
  facts: {
    license: "MIT, versus PLANKA's source-available Fair Use licence",
    hosting: "Self-host Tracing on infrastructure you control",
    sso: "Free on Tracing, Pro tier on PLANKA since 2.2",
    pricing:
      "No license fee; infrastructure and operations are your responsibility",
  },
  rows: [
    { feature: "License", kaneo: "MIT", them: "Fair Use (source-available)" },
    { feature: "Self-hostable", kaneo: true, them: true },
    { feature: "Own your data", kaneo: true, them: true },
    { feature: "Kanban boards", kaneo: true, them: true },
    { feature: "SSO / OIDC", kaneo: "Free", them: "Pro only" },
    { feature: "Backlog & workflows", kaneo: true, them: false },
    { feature: "Data export", kaneo: "Built in", them: false },
    {
      feature: "Cloud pricing",
      kaneo: "No managed hosting plan",
      them: "Per user",
    },
  ],
  reasons: [
    {
      title: "SSO is not a premium feature",
      body: "Connect Google, GitHub, Discord, or any OIDC provider on the free, self-hosted build. We think authentication is part of running software safely, not an upsell, and we don't plan to move it.",
    },
    {
      title: "Genuinely MIT",
      body: "Tracing is MIT end to end, with no Pro-only files carved out of the repository. You can fork it, run it, and change it without checking which licence a given file falls under.",
    },
    {
      title: "Your data stays portable",
      body: "Every project exports to JSON from the UI, and the whole API is public and documented. Getting out of Tracing is as easy as getting in, which is rather the point.",
    },
  ],
  migration: {
    body: "PLANKA has no export feature, so we wrote an importer that reads your boards straight from its API and recreates them in Tracing: lists, cards, labels, assignees, checklists, and comments. Run it from the Tracing app, or use the command line importer when PLANKA sits on a private network.",
    href: "https://github.com/Go-Figure-App/tracing/blob/main/apps/docs/core/migrations/from-planka.mdx",
    linkText: "Read the migration guide",
  },
  honestNote:
    "PLANKA is a good piece of software with a real team behind it, and paid tiers are a legitimate way to fund open-source work. If you're happy on the Community edition with password logins, or SSO is worth the Pro licence to you, there's no reason to move. Tracing is for teams that need SSO and don't want it behind a paywall.",
  faq: [
    {
      question: "Why did PLANKA move SSO behind a paid tier?",
      answer:
        "PLANKA 2.2 reorganised its editions and put OIDC single sign-on in the paid Pro tier. Self-hosters who had been signing in with OIDC found those accounts deactivated after upgrading. It is a legitimate way to fund the project, but it changes what the free build can do.",
    },
    {
      question: "How do I migrate from PLANKA to Tracing?",
      answer:
        "In Settings, open Workspace, then Import, choose PLANKA, and connect with your PLANKA URL and an API key. Tracing recreates lists, cards, labels, assignees, checklists, and comments. If Tracing cannot reach your PLANKA server, use the @tracing/planka-import command line tool, which runs on your own machine and has a dry-run mode.",
    },
    {
      question: "Is Tracing's licence really MIT?",
      answer:
        "Yes, the whole repository is MIT with no source-available carve-outs and no separate enterprise directory. You can fork it, modify it, and run it commercially without checking which licence covers a given file.",
    },
    {
      question: "Does Tracing have PLANKA's card features?",
      answer:
        "Tracing has boards, lists as workflow columns, labels, assignees, due dates, priorities, comments, attachments, task relations, and time tracking, plus backlog planning that PLANKA does not have. Some PLANKA card details, such as its stopwatch UI, work differently.",
    },
  ],
  related: ["trello", "wekan", "kanboard", "vikunja"],
  verifiedOn: "2026-08-19",
  sources: [
    { label: "PLANKA pricing", href: "https://planka.app/pricing" },
    {
      label: "Tracing migration guide",
      href: "/docs/core/migrations/from-planka",
    },
  ],
};

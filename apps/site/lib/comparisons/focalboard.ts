import type { Comparison } from "./types";

export const focalboard: Comparison = {
  slug: "focalboard",
  competitor: "Focalboard",
  category: "open-source",
  title: "Maintained Focalboard alternative",
  description:
    "Compare Focalboard with Tracing, an MIT-licensed tracker you can self-host with boards, triage, cycles, initiatives, views and insights.",
  summary: "An actively maintained board, independent of Mattermost.",
  heading: "The maintained Focalboard alternative",
  subheading:
    "Standalone Focalboard has been looking for maintainers since Mattermost unbundled it. If you are self-hosting it today, you are running software nobody is on the hook for.",
  verdict:
    "Tracing is a self-hosted alternative to Focalboard for issue and project planning. It includes boards, triage, project plans, milestones, initiatives, roadmaps, cycles, insights and saved views. Budget for hosting, backups and maintenance; no managed Tracing subscription is offered.",
  facts: {
    license: "MIT, versus Focalboard's mixed Mattermost licensing",
    hosting: "Self-host Tracing on infrastructure you control",
    sso: "Free on Tracing through Google, GitHub, Discord, or any OIDC provider",
    pricing:
      "No license fee; infrastructure and operations are your responsibility",
  },
  rows: [
    {
      feature: "Actively maintained",
      kaneo: true,
      them: "Community, seeking maintainers",
    },
    { feature: "License", kaneo: "MIT", them: "Mixed Mattermost licensing" },
    { feature: "Self-hostable", kaneo: true, them: true },
    {
      feature: "Runs without Mattermost",
      kaneo: true,
      them: "Standalone build only",
    },
    { feature: "SSO / OIDC", kaneo: "Built in", them: "Via Mattermost" },
    { feature: "Backlog planning", kaneo: true, them: false },
    { feature: "Time tracking", kaneo: true, them: false },
    { feature: "Official cloud", kaneo: false, them: false },
  ],
  reasons: [
    {
      title: "Somebody is maintaining it",
      body: "Tracing ships releases, security fixes, and migrations that work on existing installations. That is the whole argument here: a self-hosted board is only as good as its next update.",
    },
    {
      title: "Independent of a chat platform",
      body: "Focalboard's future is as a Mattermost plugin. Tracing is a standalone product with optional notifications in Mattermost, Slack, Discord, and Telegram.",
    },
    {
      title: "More than a board",
      body: "Backlog planning, workflow rules, roles, time tracking, notifications, an API, and an MCP server, all in the MIT-licensed build.",
    },
  ],
  honestNote:
    "If you already run Mattermost, the maintained Boards plugin keeps your tasks next to your conversations, and that adjacency is worth a lot. Tracing also has custom fields for text, numbers, dates, dropdowns, and checkboxes, but it runs as a separate app with optional Mattermost notifications.",
  faq: [
    {
      question: "Is Focalboard discontinued?",
      answer:
        "The standalone Focalboard project is no longer actively maintained by Mattermost and is looking for community maintainers. Mattermost stopped bundling the plugin in September 2023, and the plugin now continues separately as Mattermost Boards.",
    },
    {
      question: "What should I use instead of Focalboard?",
      answer:
        "For a maintained self-hosted board, Tracing, PLANKA, WeKan, and Vikunja are the usual choices. Tracing is MIT licensed with SSO included and adds backlog planning and time tracking.",
    },
    {
      question: "Can I move my Focalboard data to Tracing?",
      answer:
        "There is no dedicated importer. Focalboard exports boards as archive files, and Tracing has a public API and per-project JSON import, so a scripted migration is possible. Open a GitHub issue if you want this supported properly.",
    },
    {
      question: "Does Tracing need Mattermost or another chat tool?",
      answer:
        "No. Tracing is standalone. It can post notifications into Mattermost, Slack, Discord, or Telegram, but nothing requires them.",
    },
  ],
  related: ["planka", "wekan", "trello", "notion"],
  verifiedOn: "2026-08-19",
  sources: [
    {
      label: "Focalboard repository",
      href: "https://github.com/mattermost-community/focalboard",
    },
    { label: "Tracing pricing", href: "/pricing" },
  ],
};

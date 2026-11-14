import type { Comparison } from "./types";

export const trello: Comparison = {
  slug: "trello",
  competitor: "Trello",
  category: "saas",
  title: "Trello alternative for growing teams: Tracing vs Trello",
  description:
    "Compare Trello with Tracing, an MIT-licensed tracker you can self-host with boards, triage, cycles, initiatives, views and insights.",
  summary: "Self-hosted planning as an alternative to Trello.",
  heading: "The Trello alternative that stays simple as you grow",
  subheading:
    "Trello nails simple kanban, but your boards live on someone else's servers and grow into paid Power-Ups. Tracing keeps the simplicity, adds backlog and workflows, and lets you own the whole thing.",
  verdict:
    "Tracing is a self-hosted alternative to Trello for issue and project planning. It includes boards, triage, project plans, milestones, initiatives, roadmaps, cycles, insights and saved views. Budget for hosting, backups and maintenance; no managed Tracing subscription is offered.",
  facts: {
    license: "MIT, versus a proprietary licence for Trello",
    hosting: "Self-host Tracing on infrastructure you control",
    sso: "Free on every Tracing build, Enterprise-tier on Trello",
    pricing:
      "No license fee; infrastructure and operations are your responsibility",
  },
  rows: [
    { feature: "Open source (MIT)", kaneo: true, them: false },
    { feature: "Self-hostable", kaneo: true, them: false },
    { feature: "Own your data", kaneo: true, them: false },
    { feature: "Kanban boards", kaneo: true, them: true },
    { feature: "Backlog & workflows", kaneo: true, them: "Power-Ups" },
    { feature: "Free to self-host", kaneo: true, them: false },
    { feature: "SSO included", kaneo: "Free", them: "Enterprise" },
    {
      feature: "Cloud pricing",
      kaneo: "No managed hosting plan",
      them: "Per user",
    },
  ],
  reasons: [
    {
      title: "Just as simple",
      body: "A clean board you can use in minutes, with no manual and no onboarding wizard. Tracing keeps the thing people love about Trello.",
    },
    {
      title: "Room to grow",
      body: "Backlog planning, custom workflows, and roles are built in, so you don't hit a wall and start bolting on paid Power-Ups.",
    },
    {
      title: "Your boards, your servers",
      body: "Self-host under the MIT license with no software fee. Project exports and the public API provide ways to retrieve your data.",
    },
  ],
  migration: {
    body: "Tracing imports your Trello boards from the app: authorize Trello, pick the boards, and lists, cards, checklists, dates, labels, members, comments, and archived cards come across.",
    href: "https://github.com/Go-Figure-App/tracing/blob/main/apps/docs/core/migrations/from-trello.mdx",
    linkText: "Read the import guide",
  },
  honestNote:
    "If you only need a couple of personal boards, never want to self-host, and Trello's free tier covers you, it's a perfectly good choice. Tracing makes more sense the moment you care about owning your data or your team outgrows a simple board.",
  faq: [
    {
      question: "Is Trello open source?",
      answer:
        "No. Trello is proprietary software owned by Atlassian and runs only as a cloud service. Tracing, WeKan, and Kanboard are MIT-licensed kanban boards whose code you can read, change, and run yourself for free.",
    },
    {
      question: "Can you self-host Trello?",
      answer:
        "No. Trello is a hosted Atlassian product with no on-premise edition, so the only way to run a Trello-style board on your own server is to use a different tool. Tracing, WeKan, Kanboard, and PLANKA are the common self-hosted choices.",
    },
    {
      question: "What is the best open-source Trello alternative?",
      answer:
        "It depends on how far you expect to grow. WeKan and Kanboard stay close to a pure board. Tracing adds backlog planning, workflows, roles, time tracking, and an API while keeping the board simple, and it is MIT licensed with SSO included.",
    },
    {
      question: "Can I import my Trello boards into Tracing?",
      answer:
        "Yes. In Settings, open Workspace, then Import, choose Trello, and authorize Tracing to read your boards. Lists, cards, checklists, dates, labels, members, comments, and archived cards carry over. Attachments, custom fields, and Power-Up data do not.",
    },
    {
      question: "Is Tracing free?",
      answer:
        "Tracing is MIT licensed and has no software license or per-seat fee. Operators pay for infrastructure and maintenance. This fork does not offer a managed subscription or a hosted trial.",
    },
  ],
  related: ["planka", "wekan", "kanboard", "notion"],
  guides: [
    {
      label: "Self-hosted Trello alternatives compared",
      href: "/guides/self-hosted-trello-alternatives",
    },
    {
      label: "Best Trello alternatives, including paid tools",
      href: "/blog/best-trello-alternatives",
    },
  ],
  verifiedOn: "2026-08-19",
  sources: [
    { label: "Trello pricing", href: "https://trello.com/pricing" },
    { label: "Tracing pricing", href: "/pricing" },
  ],
};

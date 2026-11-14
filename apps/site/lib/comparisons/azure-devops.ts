import type { Comparison } from "./types";

export const azureDevops: Comparison = {
  slug: "azure-devops",
  competitor: "Azure DevOps Boards",
  category: "saas",
  title: "Standalone Azure DevOps Boards alternative",
  description:
    "Compare Azure DevOps Boards with Tracing, an MIT-licensed tracker you can self-host with boards, triage, cycles, initiatives, views and insights.",
  summary: "Self-hosted planning as an alternative to Azure DevOps Boards.",
  heading: "The standalone alternative to Azure DevOps Boards",
  subheading:
    "Azure Boards is free for five people and then priced per user, and it only makes sense if the rest of your stack is Microsoft. Tracing is a standalone tracker you can host anywhere.",
  verdict:
    "Tracing is a self-hosted alternative to Azure DevOps Boards for issue and project planning. It includes boards, triage, project plans, milestones, initiatives, roadmaps, cycles, insights and saved views. Budget for hosting, backups and maintenance; no managed Tracing subscription is offered.",
  facts: {
    license: "MIT, versus a proprietary Microsoft licence",
    hosting: "Self-host Tracing on infrastructure you control",
    sso: "Any OIDC provider, free on every Tracing build",
    pricing:
      "No license fee; infrastructure and operations are your responsibility",
  },
  rows: [
    { feature: "Open source (MIT)", kaneo: true, them: false },
    { feature: "Self-hostable", kaneo: "Free", them: "Server, paid licence" },
    { feature: "Own your data", kaneo: true, them: "In your Azure tenant" },
    {
      feature: "Free tier",
      kaneo: "Unlimited, self-hosted",
      them: "First 5 users",
    },
    {
      feature: "Identity requirement",
      kaneo: "Any OIDC provider",
      them: "Microsoft account",
    },
    { feature: "CI/CD pipelines", kaneo: false, them: true },
    { feature: "Setup", kaneo: "Minutes", them: "Org and project setup" },
    {
      feature: "Cloud pricing",
      kaneo: "No managed hosting plan",
      them: "$6/user/mo after 5",
    },
  ],
  reasons: [
    {
      title: "No tenant, no org sprawl",
      body: "Tracing needs a server and a database. There is no organisation, no project collection, and no directory to reconcile before someone can be assigned a task.",
    },
    {
      title: "Understandable in a morning",
      body: "Azure Boards inherits work-item types, area paths, and iteration paths from TFS. Tracing has projects, workflow columns, labels, and priorities.",
    },
    {
      title: "Portable by default",
      body: "MIT licence, public API, JSON export per project. Nothing about Tracing assumes you will stay on one cloud provider.",
    },
  ],
  honestNote:
    "If your organisation is already on Microsoft Entra, and you use Azure Repos, Pipelines, and Test Plans, keeping work items in the same place is the sensible choice. Tracing has no CI, no repos, and no test management, and it will not pretend otherwise.",
  faq: [
    {
      question: "What does Azure DevOps cost?",
      answer:
        "The first 5 users are free on the Basic plan, which includes Boards, Repos, Pipelines, and Artifacts. Additional users are $6 a month each, and Basic plus Test Plans is considerably more.",
    },
    {
      question: "Can Azure Boards be self-hosted?",
      answer:
        "Only through Azure DevOps Server, the on-premise edition, which is licensed separately and is a substantial install. Tracing self-hosts with Docker and PostgreSQL under the MIT license at no cost.",
    },
    {
      question: "Is there an open-source alternative to Azure Boards?",
      answer:
        "Tracing, Redmine, OpenProject, and Plane all cover work tracking without a Microsoft tenant. Tracing is the lightest to run and includes SSO through any OIDC provider, including Entra ID.",
    },
    {
      question: "Can Tracing connect to my Git repositories?",
      answer:
        "Tracing integrates with GitHub, GitLab, and Gitea, and has outgoing webhooks and a documented public API for anything else, including Azure Repos.",
    },
  ],
  related: ["jira", "github-projects", "redmine", "openproject"],
  verifiedOn: "2026-08-19",
  sources: [
    {
      label: "Azure DevOps pricing",
      href: "https://azure.microsoft.com/en-us/pricing/details/devops/azure-devops-services/",
    },
    { label: "Tracing pricing", href: "/pricing" },
  ],
};

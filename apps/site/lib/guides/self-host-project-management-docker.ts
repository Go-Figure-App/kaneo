import { landing } from "@/lib/landing";
import type { Guide } from "./types";

export const selfHostProjectManagementDocker: Guide = {
  slug: "self-host-project-management-docker",
  question: "How do I self-host a project management tool with Docker?",
  title: "How to self-host project management with Docker",
  description:
    "A practical guide to self-hosting a project manager with Docker Compose: what you need, how to run Tracing, and what to get right on backups, TLS, and updates.",
  summary: landing.selfHostingGuide.summary,
  answer: landing.selfHostingGuide.answer,
  sections: [
    {
      heading: "What you need",
      body: [
        landing.selfHostingGuide.requirements,
        "Docker Engine with the Compose plugin, a DNS record pointing at the server, and ports 80 and 443 open. Everything else runs inside the compose network.",
        "A backup destination that is not the same machine. Object storage, another VPS, or a home NAS over a tunnel. A backup on the server you are backing up is a rehearsal, not a backup.",
      ],
    },
    {
      heading: "The compose file",
      body: [
        "Tracing runs as one application container alongside PostgreSQL. The container serves both the API and the web app on port 5173, so the reverse proxy has a single upstream.",
        landing.selfHostingGuide.compose,
        "Use the source Compose setup in the core installation guide to build Tracing and configure PostgreSQL, persistent storage, and HTTPS.",
      ],
      items: [
        {
          name: landing.selfHostingGuide.composeLink,
          href: "/docs/core/installation/docker-compose",
          body: landing.selfHostingGuide.composeLinkDescription,
        },
        {
          name: "Environment variables",
          href: "/docs/core/installation/environment-variables",
          body: "Every setting, including database URL, base URLs, and OIDC configuration.",
        },
        {
          name: landing.selfHostingGuide.startLink,
          href: "/docs/core/installation/start-services",
          body: landing.selfHostingGuide.startLinkDescription,
        },
        {
          name: "Object storage",
          href: "/docs/core/installation/object-storage-and-image-uploads",
          body: "S3-compatible storage for attachments and avatars, including MinIO on your own hardware.",
        },
      ],
    },
    {
      heading: "The four things people get wrong",
      body: [
        "TLS as an afterthought. Put Caddy, Traefik, or nginx in front from the first day, not after someone has typed a password over plain HTTP. Caddy needs about four lines for automatic certificates.",
        landing.selfHostingGuide.backups,
        "Pinning to latest and never updating, or updating blind. Pin a version tag, read the release notes, and take a database dump before upgrading. Tracing's migrations run automatically on start and are written to work on existing installations, but a dump costs nothing.",
        "Skipping single sign-on because it looks like work. Connecting Google, GitHub, Discord, or your own OIDC provider takes minutes in Tracing and is free on every build, and it removes an entire class of password problems.",
      ],
    },
    {
      heading: "Is self-hosting worth it?",
      body: [
        landing.selfHostingGuide.worth,
        "Self-hosting requires someone to own updates, backups and recovery. If nobody can take that responsibility, evaluate a managed provider separately; this fork does not offer a hosted subscription.",
      ],
    },
  ],
  faq: [
    {
      question: "What are the minimum requirements to self-host Tracing?",
      answer: landing.selfHostingGuide.minimum,
    },
    {
      question: "Can I run it on a Raspberry Pi or a home server?",
      answer:
        "Yes, for a small team. The requirements are modest. Put it behind a tunnel or a reverse proxy with TLS rather than exposing ports directly, and keep backups somewhere other than the same SD card.",
    },
    {
      question: "Does Tracing run on Kubernetes?",
      answer:
        "Yes. There is an official Helm chart in the repository under charts/tracing, which covers the API, web app, database configuration, and ingress.",
    },
    {
      question: "How do updates work?",
      answer:
        "Pull the new image tag and restart the stack. Database migrations run on startup and are written to work against existing installations. Take a database dump first, as with anything.",
    },
  ],
  related: [
    { label: "Installation guide", href: "/docs/core/installation" },
    {
      label: "Best open-source project management software",
      href: "/guides/best-open-source-project-management-software",
    },
    { label: "Pricing", href: "/pricing" },
  ],
  updatedOn: "2026-09-24",
};

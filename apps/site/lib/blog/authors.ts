import type { BlogAuthor } from "./types";

const all: BlogAuthor[] = [
  {
    id: "andrej",
    name: "Andrej Acevski",
    role: "Founder, Tracing",
    url: "https://github.com/andrejsshell",
  },
  {
    id: "kaneo-team",
    name: "The Tracing team",
    role: "Tracing",
    url: "https://github.com/Go-Figure-App/tracing",
  },
];

export const authorList = all;

export const authors: Record<string, BlogAuthor> = Object.fromEntries(
  all.map((author) => [author.id, author]),
);

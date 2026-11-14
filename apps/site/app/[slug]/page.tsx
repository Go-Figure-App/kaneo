import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ComparisonPage } from "@/components/landing/comparison-page";
import {
  alternativePath,
  comparisonList,
  comparisons,
} from "@/lib/comparisons";

type Params = { slug: string };

export function generateStaticParams(): Params[] {
  return comparisonList.map((comparison) => ({
    slug: `${comparison.slug}-alternative`,
  }));
}

function lookup(slug: string) {
  return comparisons[slug.replace(/-alternative$/, "")];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { slug } = await params;
  const data = lookup(slug);
  if (!data) return {};

  return {
    title: data.title,
    description: data.description,
    alternates: { canonical: alternativePath(data.slug) },
    openGraph: {
      type: "article",
      siteName: "Tracing",
      images: ["/images/hero.png"],
      title: `${data.title} | Tracing`,
      description: data.description,
      url: `https://tracing.gofigureapp.io${alternativePath(data.slug)}`,
    },
    twitter: {
      card: "summary_large_image",
      title: `${data.title} | Tracing`,
      description: data.description,
      images: ["/images/hero.png"],
    },
  };
}

export default async function Page({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const data = lookup(slug);
  if (!data) notFound();

  return <ComparisonPage data={data} />;
}

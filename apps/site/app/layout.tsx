import type { Metadata, Viewport } from "next";
import { ThemeSync } from "@/components/landing/theme-sync";
import { landing } from "@/lib/landing";
import "./globals.css";

const siteTitle = landing.seo.title;
const siteDescription = landing.seo.description;

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#141414" },
  ],
};

export const metadata: Metadata = {
  metadataBase: new URL("https://tracing.gofigureapp.io"),
  title: {
    default: siteTitle,
    template: "%s | Tracing",
  },
  description: siteDescription,
  keywords: [
    "kaneo",
    "project management",
    "project management software",
    "kanban",
    "task management",
    "issue tracking",
    "team collaboration",
  ],
  applicationName: "Tracing",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    url: "https://tracing.gofigureapp.io",
    siteName: "Tracing",
    title: siteTitle,
    description: siteDescription,
    images: [
      {
        url: "/images/hero.png",
        width: 1200,
        height: 630,
        alt: "Tracing",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: siteTitle,
    description: siteDescription,
    images: ["/images/hero.png"],
  },
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
    apple: "/apple-touch-icon.png",
  },
  category: "productivity",
  creator: "Tracing",
  publisher: "Tracing",
};

const jsonLd = [
  {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Tracing",
    url: "https://tracing.gofigureapp.io",
    logo: "https://tracing.gofigureapp.io/logo-512.png",
    sameAs: ["https://github.com/Go-Figure-App/tracing"],
  },
  {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Tracing",
    url: "https://tracing.gofigureapp.io",
    inLanguage: "en",
  },
  {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Tracing",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web, Linux, macOS, Windows",
    description: siteDescription,
    url: "https://tracing.gofigureapp.io",
    image: "https://tracing.gofigureapp.io/images/hero.png",
    license: "https://github.com/Go-Figure-App/tracing/blob/main/LICENSE",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
      url: "https://github.com/Go-Figure-App/tracing",
    },
  },
];

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          // eslint-disable-next-line react/no-danger -- Apply the theme before the page paints, including when JavaScript bundles load slowly.
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                var stored = null;
                try {
                  stored = localStorage.getItem('kaneo-site-theme');
                } catch (e) {}
                var isDark = stored === 'dark' || (stored !== 'light' && window.matchMedia('(prefers-color-scheme: dark)').matches);
                document.documentElement.classList.toggle('dark', isDark);
                document.documentElement.style.colorScheme = isDark ? 'dark' : 'light';
              })();
            `,
          }}
        />
      </head>
      <body>
        <ThemeSync />
        {children}
        <script
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger -- JSON-LD structured data must be inlined as a script tag for search engines to parse.
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </body>
    </html>
  );
}

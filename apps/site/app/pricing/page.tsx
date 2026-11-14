import type { Metadata } from "next";
import { Footer } from "@/components/landing/footer";
import { Navbar } from "@/components/landing/navbar";

export const metadata: Metadata = {
  title: "Self-host Tracing",
  description: "Build and run Tracing on your own infrastructure.",
};
export default function PricingPage() {
  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-4xl px-6 py-20 space-y-6">
        <h1 className="text-4xl font-semibold">Self-host Tracing</h1>
        <p>
          Tracing is open source under the MIT license. Build it from this
          repository and run it on your own infrastructure.
        </p>
        <p>
          Go Figure operates its own workspace. This fork does not offer the
          upstream Kaneo commercial cloud plans or app-store purchases.
        </p>
        <a
          className="underline"
          href="https://github.com/Go-Figure-App/tracing#readme"
        >
          Read the setup guide
        </a>
      </main>
      <Footer />
    </>
  );
}

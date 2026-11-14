import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const OPEN_APP = "https://tracing.gofigureapp.io/auth/sign-in";
const PRICING = "/pricing";

export function BlogCta({ compact = false }: { compact?: boolean }) {
  return (
    <aside
      className={cn(
        "rounded-xl border bg-sidebar",
        compact ? "p-6" : "p-6 md:p-8",
      )}
    >
      <p
        className={cn(
          "text-balance font-medium leading-snug",
          compact ? "text-base" : "text-xl md:text-2xl",
        )}
      >
        Plan your work with Tracing
      </p>
      <p
        className={cn(
          "mt-2.5 text-muted-foreground leading-relaxed",
          compact ? "text-sm" : "",
        )}
      >
        Open-source planning for issues, projects, initiatives, and cycles.
        Build Tracing from source and run it on your own infrastructure.
      </p>
      <div
        className={cn(
          "flex flex-wrap items-center gap-2.5",
          compact ? "mt-5" : "mt-6",
        )}
      >
        <Button
          size="lg"
          className={cn("h-12 px-5 text-sm sm:h-12", compact && "w-full")}
          render={<a href={OPEN_APP} />}
        >
          Open Tracing
        </Button>
        <Button
          variant="outline"
          size="lg"
          className={cn("h-12 px-5 text-sm sm:h-12", compact && "w-full")}
          render={<a href={PRICING} />}
        >
          Self-host Tracing
        </Button>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        Available under the MIT license.
      </p>
    </aside>
  );
}

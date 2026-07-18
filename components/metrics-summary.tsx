import {
  Receipt,
  Wallet,
  Building2,
  Scale,
  Gavel,
  Globe,
  Target,
} from "lucide-react";
import { cn, usd } from "@/lib/utils";
import type { Metrics } from "@/lib/metrics";

function StatTile({
  icon: Icon,
  label,
  value,
  sub,
  className,
}: {
  icon: typeof Receipt;
  label: string;
  value: string | number;
  sub?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-card p-4",
        className,
      )}
    >
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="size-4" />
        <span className="text-xs">{label}</span>
      </div>
      <p className="mt-1.5 text-2xl font-semibold tabular-nums tracking-tight text-foreground">
        {value}
      </p>
      {sub ? <p className="text-xs text-muted-foreground">{sub}</p> : null}
    </div>
  );
}

export function MetricsSummary({ metrics }: { metrics: Metrics }) {
  const {
    purchaseCount,
    totalSpend,
    brandCount,
    lawsuitCount,
    activeCount,
    courtCount,
    webCount,
    avgConfidence,
    topBrands,
  } = metrics;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile
          icon={Receipt}
          label="Purchases found"
          value={purchaseCount}
          sub={`${brandCount} brand${brandCount === 1 ? "" : "s"}`}
        />
        <StatTile
          icon={Wallet}
          label="Total spent"
          value={usd(totalSpend)}
          sub="across your receipts"
        />
        <StatTile
          icon={Scale}
          label="Lawsuits found"
          value={lawsuitCount}
          sub={`${activeCount} active`}
        />
        <StatTile
          icon={Target}
          label="Avg. confidence"
          value={`${Math.round(avgConfidence * 100)}%`}
          sub="classifier match"
        />
      </div>

      {(courtCount > 0 || webCount > 0 || topBrands.length > 0) && (
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-xl border border-border/70 bg-muted/20 px-4 py-3 text-sm">
          {courtCount > 0 && (
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <Gavel className="size-4" />
              <span className="font-medium text-foreground">{courtCount}</span>{" "}
              from court dockets
            </span>
          )}
          {webCount > 0 && (
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <Globe className="size-4" />
              <span className="font-medium text-foreground">{webCount}</span>{" "}
              from web research
            </span>
          )}
          {topBrands.length > 0 && (
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <Building2 className="size-4" />
              Top:{" "}
              <span className="font-medium text-foreground">
                {topBrands
                  .slice(0, 3)
                  .map((b) => b.brand)
                  .join(", ")}
              </span>
            </span>
          )}
        </div>
      )}
    </div>
  );
}

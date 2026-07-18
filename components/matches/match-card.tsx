import {
  Check,
  FileText,
  TriangleAlert,
  CalendarClock,
  Mail,
  Upload,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn, usd } from "@/lib/utils";
import { getPurchase } from "@/lib/mock-data";
import type { MatchResult, Settlement } from "@/lib/types";

function formatDeadline(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(d);
}

function confidenceVariant(
  confidence: number,
): "success" | "warning" | "outline" {
  if (confidence >= 0.85) return "success";
  if (confidence >= 0.65) return "warning";
  return "outline";
}

export function MatchCard({
  match,
  settlement,
}: {
  match: MatchResult;
  settlement: Settlement;
}) {
  const confidencePct = Math.round(match.confidence * 100);
  const evidence = match.evidence
    .map((id) => getPurchase(id))
    .filter((p): p is NonNullable<typeof p> => Boolean(p));

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-xl border border-border/70 bg-card text-card-foreground shadow-lg">
      {/* Header band */}
      <div className="flex items-start justify-between gap-3 border-b border-border/60 bg-muted/30 px-6 pt-6 pb-5">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="accent">{settlement.category}</Badge>
          <Badge variant={confidenceVariant(match.confidence)}>
            {confidencePct}% match
          </Badge>
        </div>
        {settlement.isMock ? (
          <Badge variant="secondary" className="shrink-0">
            Demo
          </Badge>
        ) : null}
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-6 py-5">
        {/* Title + defendant */}
        <div className="space-y-1">
          <h3 className="text-card-title text-foreground">{settlement.name}</h3>
          <p className="text-sm text-muted-foreground">
            {settlement.defendant} · {settlement.classPeriod}
          </p>
        </div>

        {/* Estimated payout */}
        <div className="rounded-lg border border-primary/15 bg-primary/5 px-4 py-3">
          <p className="text-eyebrow uppercase text-muted-foreground">
            Estimated payout
          </p>
          <p className="text-display-md text-primary">{usd(match.estPayout)}</p>
        </div>

        {/* Why you qualify */}
        {match.whyQualified.length > 0 ? (
          <div className="space-y-2">
            <p className="text-eyebrow uppercase text-muted-foreground">
              Why you qualify
            </p>
            <ul className="space-y-2">
              {match.whyQualified.map((reason) => (
                <li key={reason} className="flex items-start gap-2 text-sm">
                  <Check className="mt-0.5 size-4 shrink-0 text-chart-3" />
                  <span className="text-foreground/90">{reason}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {/* Evidence */}
        {evidence.length > 0 ? (
          <div className="space-y-2">
            <p className="text-eyebrow uppercase text-muted-foreground">
              Evidence found
            </p>
            <div className="flex flex-wrap gap-2">
              {evidence.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center gap-2 rounded-lg border border-border/70 bg-background px-3 py-1.5 text-xs"
                >
                  <FileText className="size-3.5 shrink-0 text-muted-foreground" />
                  <span className="font-medium text-foreground">
                    {p.merchant}
                  </span>
                  <span className="text-muted-foreground">
                    {p.evidenceLabel}
                  </span>
                  <span
                    className="ml-0.5 inline-flex items-center gap-1 text-muted-foreground/80"
                    title={p.source === "gmail" ? "From Gmail" : "Uploaded"}
                  >
                    {p.source === "gmail" ? (
                      <Mail className="size-3" />
                    ) : (
                      <Upload className="size-3" />
                    )}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {/* Uncertainties */}
        {match.uncertainties.length > 0 ? (
          <div className="space-y-2 rounded-lg border border-chart-4/40 bg-chart-4/10 px-4 py-3">
            <p className="text-eyebrow flex items-center gap-1.5 uppercase text-amber-700 dark:text-amber-300">
              <TriangleAlert className="size-3.5" />
              Worth a look
            </p>
            <ul className="space-y-1.5">
              {match.uncertainties.map((u) => (
                <li
                  key={u}
                  className="flex items-start gap-2 text-sm text-foreground/80"
                >
                  <span className="mt-1.5 size-1 shrink-0 rounded-full bg-chart-4" />
                  <span>{u}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>

      {/* Deadline footer */}
      <div
        className={cn(
          "flex items-center gap-2 border-t border-border/60 px-6 py-3 text-sm text-muted-foreground",
        )}
      >
        <CalendarClock className="size-4 shrink-0" />
        File by{" "}
        <span className="font-medium text-foreground">
          {formatDeadline(settlement.deadline)}
        </span>
      </div>
    </div>
  );
}

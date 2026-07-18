import {
  Check,
  FileText,
  TriangleAlert,
  CalendarClock,
  Mail,
  Upload,
  Gavel,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn, usd } from "@/lib/utils";
import type { MatchView } from "@/lib/api";

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

function formatPayout(low: number | undefined, high: number): string {
  if (low && low !== high) return `${usd(low)}–${usd(high)}`;
  return usd(high);
}

export function MatchCard({ view }: { view: MatchView }) {
  const confidencePct = Math.round(view.confidence * 100);

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-xl border border-border/70 bg-card text-card-foreground shadow-lg">
      {/* Header band */}
      <div className="flex items-start justify-between gap-3 border-b border-border/60 bg-muted/30 px-6 pt-6 pb-5">
        <div className="flex flex-wrap items-center gap-2">
          {view.category ? (
            <Badge variant="accent">{view.category}</Badge>
          ) : null}
          <Badge variant={confidenceVariant(view.confidence)}>
            {confidencePct}% match
          </Badge>
          {view.active ? <Badge variant="secondary">Active case</Badge> : null}
        </div>
        {view.isMock ? (
          <Badge variant="secondary" className="shrink-0">
            Demo
          </Badge>
        ) : null}
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-6 py-5">
        {/* Title + defendant */}
        <div className="space-y-1">
          <h3 className="text-card-title text-foreground">{view.title}</h3>
          <p className="text-sm text-muted-foreground">
            {view.subtitle
              ? `${view.defendant} · ${view.subtitle}`
              : view.defendant}
          </p>
          {view.summary ? (
            <p className="pt-1 text-sm text-foreground/70">{view.summary}</p>
          ) : null}
        </div>

        {/* Payout when known, otherwise a confidence-led estimate block */}
        {view.payoutHigh != null ? (
          <div className="rounded-lg border border-primary/15 bg-primary/5 px-4 py-3">
            <p className="text-eyebrow uppercase text-muted-foreground">
              Estimated payout
            </p>
            <p className="text-display-md text-primary">
              {formatPayout(view.payoutLow, view.payoutHigh)}
            </p>
          </div>
        ) : (
          <div className="rounded-lg border border-primary/15 bg-primary/5 px-4 py-3">
            <p className="text-eyebrow uppercase text-muted-foreground">
              Match confidence
            </p>
            <p className="text-display-md text-primary">{confidencePct}%</p>
            <p className="text-xs text-muted-foreground">
              Payout is set by the settlement when you file.
            </p>
          </div>
        )}

        {/* Why you qualify */}
        {view.whyQualified.length > 0 ? (
          <div className="space-y-2">
            <p className="text-eyebrow uppercase text-muted-foreground">
              Why you qualify
            </p>
            <ul className="space-y-2">
              {view.whyQualified.map((reason) => (
                <li key={reason} className="flex items-start gap-2 text-sm">
                  <Check className="mt-0.5 size-4 shrink-0 text-chart-3" />
                  <span className="text-foreground/90">{reason}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {/* Evidence */}
        {view.evidence.length > 0 ? (
          <div className="space-y-2">
            <p className="text-eyebrow uppercase text-muted-foreground">
              Evidence found
            </p>
            <div className="flex flex-wrap gap-2">
              {view.evidence.map((p) => (
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
        {view.uncertainties.length > 0 ? (
          <div className="space-y-2 rounded-lg border border-chart-4/40 bg-chart-4/10 px-4 py-3">
            <p className="text-eyebrow flex items-center gap-1.5 uppercase text-amber-700 dark:text-amber-300">
              <TriangleAlert className="size-3.5" />
              Worth a look
            </p>
            <ul className="space-y-1.5">
              {view.uncertainties.map((u) => (
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

      {/* Footer: deadline when known, else the case source */}
      <div
        className={cn(
          "flex items-center gap-2 border-t border-border/60 px-6 py-3 text-sm text-muted-foreground",
        )}
      >
        {view.deadline ? (
          <>
            <CalendarClock className="size-4 shrink-0" />
            File by{" "}
            <span className="font-medium text-foreground">
              {formatDeadline(view.deadline)}
            </span>
          </>
        ) : (
          <>
            <Gavel className="size-4 shrink-0" />
            <span className="truncate">Found in active class-action docket</span>
          </>
        )}
      </div>
    </div>
  );
}

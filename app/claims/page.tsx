"use client";

import { useMemo, useState } from "react";
import { PenLine, ShieldCheck } from "lucide-react";
import { Navbar } from "@/components/navbar";
import { claimRuns, getSettlement } from "@/lib/mock-data";
import type { ClaimRun } from "@/lib/types";
import { usd } from "@/lib/utils";
import { ClaimRow } from "@/components/claims/claim-row";
import { FilingViewer } from "@/components/claims/filing-viewer";

export default function ClaimsPage() {
  const [runs, setRuns] = useState<ClaimRun[]>(claimRuns);
  const [selectedId, setSelectedId] = useState<string>(claimRuns[0]?.id ?? "");

  const selectedRun = runs.find((r) => r.id === selectedId) ?? runs[0];

  const stats = useMemo(() => {
    const queued = runs.filter((r) => r.status === "queued").length;
    const awaiting = runs.filter(
      (r) => r.status === "awaiting_approval",
    ).length;
    const estRecovery = runs.reduce((sum, r) => {
      const s = getSettlement(r.settlementId);
      if (!s) return sum;
      return sum + Math.round((s.payoutLow + s.payoutHigh) / 2);
    }, 0);
    return { queued, awaiting, estRecovery };
  }, [runs]);

  function handleStart(id: string) {
    setRuns((prev) =>
      prev.map((r) =>
        r.id === id ? { ...r, status: "filling", progress: Math.max(r.progress, 10) } : r,
      ),
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="mx-auto max-w-6xl px-6 py-10">
        {/* Header */}
        <header>
          <p className="text-eyebrow uppercase text-primary">Auto-filing</p>
          <h1 className="mt-1 text-headline text-foreground">
            Your claim queue
          </h1>
          <p className="mt-2 max-w-2xl text-body-lg text-muted-foreground">
            The agent works through each settlement, fills every field, and then
            pauses. You review the entries and add your signature. Settlers never
            attests or submits for you.
          </p>

          {/* Stat row */}
          <dl className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Stat label="In queue" value={String(stats.queued)} />
            <Stat
              label="Awaiting your signature"
              value={String(stats.awaiting)}
              emphasis
            />
            <Stat
              label="Est. recovery"
              value={usd(stats.estRecovery)}
              className="col-span-2 sm:col-span-1"
            />
          </dl>
        </header>

        {/* Guardrail strip */}
        <div className="mt-6 flex items-start gap-3 rounded-xl bg-secondary/50 px-4 py-3">
          <ShieldCheck className="mt-0.5 size-5 shrink-0 text-primary" />
          <p className="text-sm text-secondary-foreground">
            <span className="font-semibold">Human-in-the-loop:</span> the agent
            fills every field but always stops before signing. You attest and
            submit yourself.
          </p>
        </div>

        {/* Two-column layout */}
        <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,22rem)_1fr]">
          {/* Queue list */}
          <section aria-label="Claim queue" className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-sm font-semibold text-muted-foreground">
                Queue
              </h2>
              <span className="text-xs text-muted-foreground">
                {runs.length} claims
              </span>
            </div>
            <div className="space-y-3">
              {runs.map((run) => (
                <ClaimRow
                  key={run.id}
                  run={run}
                  selected={run.id === selectedRun?.id}
                  onSelect={() => setSelectedId(run.id)}
                />
              ))}
            </div>
          </section>

          {/* Detail / viewer */}
          <section aria-label="Filing viewer">
            {selectedRun ? (
              <FilingViewer run={selectedRun} onStart={handleStart} />
            ) : (
              <div className="grid h-40 place-items-center rounded-xl border border-dashed border-border text-sm text-muted-foreground">
                Select a claim to see its filing.
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}

function Stat({
  label,
  value,
  emphasis,
  className,
}: {
  label: string;
  value: string;
  emphasis?: boolean;
  className?: string;
}) {
  return (
    <div
      className={`rounded-xl border bg-card p-4 shadow-sm ${
        emphasis ? "border-primary/40" : "border-border"
      } ${className ?? ""}`}
    >
      <dt className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-muted-foreground">
        {emphasis && <PenLine className="size-3.5 text-primary" />}
        {label}
      </dt>
      <dd
        className={`mt-1.5 text-2xl font-semibold tabular-nums ${
          emphasis ? "text-primary" : "text-card-foreground"
        }`}
      >
        {value}
      </dd>
    </div>
  );
}

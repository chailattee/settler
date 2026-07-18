"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  MagnifyingGlass,
  EnvelopeSimple,
  Receipt,
  Buildings,
  SealCheck,
  Sparkle,
  CircleNotch,
  Warning,
  ArrowRight,
  ArrowCounterClockwise,
  CheckCircle,
} from "@phosphor-icons/react/dist/ssr";

import { Navbar } from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { MetricsSummary } from "@/components/metrics-summary";
import { runWorkflow, fetchPurchases, fetchMatches } from "@/lib/api";
import { computeMetrics, type Metrics } from "@/lib/metrics";
import { cn } from "@/lib/utils";
import type { AgentEvent } from "@/lib/events";

type FeedKind = "status" | "purchase" | "brand" | "match";

interface FeedItem {
  id: number;
  kind: FeedKind;
  title: string;
  detail?: string;
}

const KIND_META: Record<
  FeedKind,
  { icon: typeof EnvelopeSimple; className: string }
> = {
  status: { icon: Sparkle, className: "bg-secondary text-secondary-foreground" },
  purchase: { icon: Receipt, className: "bg-accent/50 text-accent-foreground" },
  brand: { icon: Buildings, className: "bg-muted text-muted-foreground" },
  match: { icon: SealCheck, className: "bg-chart-3/15 text-chart-3" },
};

function ScanRunner() {
  const params = useSearchParams();
  const demo = params.get("demo") === "1";

  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [scan, setScan] = useState<{ scanned: number; total: number } | null>(
    null,
  );
  const [counts, setCounts] = useState({ purchases: 0, matches: 0 });
  const [phase, setPhase] = useState<
    "checking" | "running" | "done" | "error"
  >("checking");
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  // True when the done state is showing a previously-saved scan rather than a
  // run that just finished this visit.
  const [fromCache, setFromCache] = useState(false);

  const nextId = useRef(0);
  const started = useRef(false);
  const controllerRef = useRef<AbortController | null>(null);

  function push(item: Omit<FeedItem, "id">) {
    setFeed((f) => [{ id: nextId.current++, ...item }, ...f].slice(0, 40));
  }

  // Stream a fresh workflow run into the live feed.
  const startRun = useCallback(() => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;

    nextId.current = 0;
    setFeed([]);
    setScan(null);
    setCounts({ purchases: 0, matches: 0 });
    setMetrics(null);
    setErrorMsg("");
    setFromCache(false);
    setPhase("running");

    function onEvent(e: AgentEvent) {
      switch (e.type) {
        case "status":
          push({ kind: "status", title: e.message });
          break;
        case "gmail_scanning":
          setScan({ scanned: e.scanned, total: e.total });
          break;
        case "purchase_found":
          setCounts((c) => ({ ...c, purchases: c.purchases + 1 }));
          push({
            kind: "purchase",
            title: e.purchase.item,
            detail: `${e.purchase.merchant} · ${e.purchase.brand}`,
          });
          break;
        case "brand_lookup":
          push({ kind: "brand", title: e.message, detail: e.brand });
          break;
        case "match":
          setCounts((c) => ({ ...c, matches: c.matches + 1 }));
          push({
            kind: "match",
            title: `Match: ${e.title}`,
            detail: `${e.brand} · ${Math.round(e.confidence * 100)}% confidence${e.active ? " · active" : ""}`,
          });
          break;
        case "done":
          setCounts({ purchases: e.purchases, matches: e.matches });
          setPhase("done");
          break;
        case "error":
          setErrorMsg(e.message);
          setPhase("error");
          break;
      }
    }

    runWorkflow(onEvent, { demo }, controller.signal).catch((err) => {
      if (controller.signal.aborted) return;
      setErrorMsg(err instanceof Error ? err.message : String(err));
      setPhase("error");
    });
  }, [demo]);

  // On first mount: a demo always runs; otherwise show the last saved scan if
  // there is one (with a Retry option), and only auto-run for first-timers.
  useEffect(() => {
    if (started.current) return;
    started.current = true;

    if (demo) {
      startRun();
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const [purchases, matches] = await Promise.all([
          fetchPurchases(),
          fetchMatches(),
        ]);
        if (cancelled) return;
        if (matches.length > 0) {
          setCounts({ purchases: purchases.length, matches: matches.length });
          setMetrics(computeMetrics(purchases, matches));
          setFromCache(true);
          setPhase("done");
        } else {
          startRun();
        }
      } catch {
        if (!cancelled) startRun();
      }
    })();

    return () => {
      cancelled = true;
      controllerRef.current?.abort();
    };
  }, [demo, startRun]);

  // After a fresh run completes, load persisted data and compute metrics.
  useEffect(() => {
    if (phase !== "done" || metrics) return;
    let cancelled = false;
    (async () => {
      try {
        const [purchases, matches] = await Promise.all([
          fetchPurchases(),
          fetchMatches(),
        ]);
        if (!cancelled) setMetrics(computeMetrics(purchases, matches));
      } catch {
        // metrics are a nice-to-have; ignore load failures
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [phase, metrics]);

  const scanPct = scan && scan.total > 0 ? (scan.scanned / scan.total) * 100 : 0;

  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      {/* Header */}
      <header className="mb-8 flex items-start gap-4">
        <span
          className={cn(
            "grid size-12 shrink-0 place-items-center rounded-xl text-primary-foreground",
            phase === "error" ? "bg-destructive" : "bg-primary",
          )}
        >
          {phase === "checking" ? (
            <CircleNotch className="size-6 animate-spin" />
          ) : phase === "running" ? (
            <MagnifyingGlass className="size-6 animate-pulse" />
          ) : phase === "done" ? (
            <CheckCircle className="size-6" />
          ) : (
            <Warning className="size-6" />
          )}
        </span>
        <div className="min-w-0">
          <p className="text-eyebrow uppercase text-muted-foreground">
            {demo
              ? "Demo scan"
              : phase === "checking"
                ? "Your voyage log"
                : fromCache
                  ? "Saved analysis"
                  : "Scanning your inbox"}
          </p>
          <h1 className="text-headline text-foreground">
            {phase === "checking"
              ? "Loading your last scan"
              : phase === "running"
                ? "Finding settlements you qualify for"
                : phase === "done"
                  ? fromCache
                    ? "Your last scan"
                    : "Scan complete"
                  : "Scan interrupted"}
          </h1>
        </div>
      </header>

      {/* Checking for a prior scan */}
      {phase === "checking" ? (
        <div className="flex items-center gap-2 rounded-xl border border-dashed border-border px-4 py-6 text-sm text-muted-foreground">
          <CircleNotch className="size-4 animate-spin" />
          Checking for a previous scan…
        </div>
      ) : null}

      {/* Gmail progress */}
      {scan ? (
        <div className="mb-6 rounded-xl border border-border bg-card p-4">
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2 text-muted-foreground">
              <EnvelopeSimple className="size-4" />
              Reading receipt emails
            </span>
            <span className="font-medium tabular-nums">
              {scan.scanned}/{scan.total}
            </span>
          </div>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <motion.div
              className="h-full rounded-full bg-primary"
              initial={false}
              animate={{ width: `${scanPct}%` }}
              transition={{ type: "spring", stiffness: 200, damping: 30 }}
            />
          </div>
        </div>
      ) : null}

      {/* Live counters */}
      {phase !== "checking" ? (
        <div className="mb-6 grid grid-cols-2 gap-4">
          <Counter
            icon={Receipt}
            label="Purchases found"
            value={counts.purchases}
          />
          <Counter icon={SealCheck} label="Matches" value={counts.matches} />
        </div>
      ) : null}

      {/* Metrics summary (computed from documented API data) */}
      {phase === "done" && metrics ? (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <p className="text-eyebrow mb-2 uppercase text-muted-foreground">
            What we found
          </p>
          <MetricsSummary metrics={metrics} />
        </motion.div>
      ) : null}

      {/* Done / error banner */}
      {phase === "done" ? (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 flex flex-col items-start gap-3 rounded-xl border border-chart-3/30 bg-chart-3/10 p-5 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex items-center gap-3">
            <CheckCircle className="size-5 text-chart-3" />
            <p className="text-sm">
              {fromCache ? "Your last scan found " : "Found "}
              <span className="font-semibold">{counts.matches} matches</span>{" "}
              across {counts.purchases} purchases.
            </p>
          </div>
          <div className="flex shrink-0 gap-2">
            <Button variant="outline" onClick={startRun}>
              <ArrowCounterClockwise className="size-4" />
              {fromCache ? "Scan again" : "Retry scan"}
            </Button>
            <Button asChild>
              <Link href="/matches">
                Review matches
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
        </motion.div>
      ) : null}

      {phase === "error" ? (
        <div className="mb-6 flex flex-col items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/10 p-5">
          <div className="flex items-center gap-2 text-sm">
            <Warning className="size-5 shrink-0 text-destructive" />
            <span>
              {errorMsg || "The scan didn't finish."} You can still review any
              matches found so far.
            </span>
          </div>
          <div className="flex gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href="/matches">Go to matches</Link>
            </Button>
            <Button size="sm" onClick={startRun}>
              <ArrowCounterClockwise className="size-4" />
              Retry scan
            </Button>
          </div>
        </div>
      ) : null}

      {/* Activity feed (only while/after a live run) */}
      {feed.length > 0 || phase === "running" ? (
        <div className="space-y-2">
          <p className="text-eyebrow uppercase text-muted-foreground">
            Activity
          </p>
          <div className="space-y-2">
          <AnimatePresence initial={false}>
            {feed.map((item) => {
              const meta = KIND_META[item.kind];
              const Icon = meta.icon;
              return (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ type: "spring", stiffness: 400, damping: 34 }}
                  className="flex items-start gap-3 rounded-lg border border-border/70 bg-card px-3.5 py-2.5"
                >
                  <span
                    className={cn(
                      "mt-0.5 grid size-7 shrink-0 place-items-center rounded-md",
                      meta.className,
                    )}
                  >
                    <Icon className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">
                      {item.title}
                    </p>
                    {item.detail ? (
                      <p className="truncate text-xs text-muted-foreground">
                        {item.detail}
                      </p>
                    ) : null}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {phase === "running" && feed.length === 0 ? (
            <div className="flex items-center gap-2 rounded-lg border border-dashed border-border px-3.5 py-3 text-sm text-muted-foreground">
              <CircleNotch className="size-4 animate-spin" />
              Warming up the agent…
            </div>
          ) : null}
          </div>
        </div>
      ) : null}
    </main>
  );
}

function Counter({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof EnvelopeSimple;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="size-4" />
        <span className="text-xs">{label}</span>
      </div>
      <motion.p
        key={value}
        initial={{ scale: 0.8, opacity: 0.6 }}
        animate={{ scale: 1, opacity: 1 }}
        className="mt-1 text-display-md tabular-nums text-foreground"
      >
        {value}
      </motion.p>
    </div>
  );
}

export default function ScanPage() {
  return (
    <div className="min-h-dvh bg-background">
      <Navbar />
      <Suspense
        fallback={
          <div className="mx-auto max-w-2xl px-6 py-20 text-center text-muted-foreground">
            <CircleNotch className="mx-auto size-6 animate-spin" />
          </div>
        }
      >
        <ScanRunner />
      </Suspense>
    </div>
  );
}

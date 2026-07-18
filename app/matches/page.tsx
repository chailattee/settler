"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Check,
  X,
  Undo2,
  Sparkles,
  PartyPopper,
  ArrowRight,
  Loader2,
  ScanSearch,
  TriangleAlert,
} from "lucide-react";

import { Navbar } from "@/components/navbar";
import { Button } from "@/components/ui/button";
import {
  SwipeCard,
  type SwipeDirection,
} from "@/components/matches/swipe-card";
import {
  fetchMatches,
  fetchPurchases,
  toMatchView,
  matchPayoutMid,
  type MatchView,
} from "@/lib/api";
import { usd } from "@/lib/utils";

type Decision = SwipeDirection;
type LoadState = "loading" | "error" | "ready";

interface HistoryEntry {
  matchId: string;
  decision: Decision;
}

function sumPayout(views: MatchView[]): number {
  return views.reduce((sum, v) => sum + matchPayoutMid(v), 0);
}

export default function MatchesPage() {
  const [deck, setDeck] = useState<MatchView[]>([]);
  const [status, setStatus] = useState<LoadState>("loading");

  const [index, setIndex] = useState(0);
  const [queued, setQueued] = useState<string[]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [flyDir, setFlyDir] = useState<Decision | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [matches, purchases] = await Promise.all([
          fetchMatches(),
          fetchPurchases(),
        ]);
        if (cancelled) return;
        setDeck(matches.map((m) => toMatchView(m, purchases)));
        setStatus("ready");
      } catch {
        if (!cancelled) setStatus("error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const total = deck.length;
  const reviewed = index;
  const done = total > 0 && index >= total;

  const hasPayout = useMemo(
    () => deck.some((v) => v.payoutHigh != null),
    [deck],
  );

  const queuedViews = useMemo(
    () => deck.filter((v) => queued.includes(v.id)),
    [deck, queued],
  );
  const queuedPayout = useMemo(() => sumPayout(queuedViews), [queuedViews]);
  const runningTotal = useMemo(
    () => queuedPayout + sumPayout(deck.slice(index)),
    [deck, index, queuedPayout],
  );

  function requestFly(dir: Decision) {
    if (flyDir || done) return;
    setFlyDir(dir);
  }

  function commitDecision(dir: Decision) {
    const current = deck[index];
    if (current && dir === "right") {
      setQueued((q) => (q.includes(current.id) ? q : [...q, current.id]));
    }
    if (current) {
      setHistory((h) => [...h, { matchId: current.id, decision: dir }]);
    }
    setIndex((i) => i + 1);
    setFlyDir(null);
  }

  function handleUndo() {
    if (history.length === 0 || flyDir) return;
    const last = history[history.length - 1];
    setHistory((h) => h.slice(0, -1));
    if (last.decision === "right") {
      setQueued((q) => q.filter((id) => id !== last.matchId));
    }
    setIndex((i) => Math.max(0, i - 1));
  }

  const showDeck = status === "ready" && total > 0;

  return (
    <div className="min-h-dvh bg-background">
      <Navbar />

      <main className="mx-auto max-w-2xl px-6 py-10">
        {/* Header */}
        <header className="mb-8 space-y-3">
          <p className="text-eyebrow flex items-center gap-1.5 uppercase text-muted-foreground">
            <Sparkles className="size-3.5 text-primary" />
            Verify your matches
          </p>
          <h1 className="text-headline text-foreground">
            Swipe to confirm what&apos;s yours
          </h1>

          {showDeck ? (
            <>
              <div className="flex flex-wrap items-center gap-x-6 gap-y-2 pt-1">
                {hasPayout ? (
                  <div className="flex items-baseline gap-2">
                    <span className="text-body-lg font-semibold text-primary">
                      {usd(runningTotal)}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      estimated across your matches
                    </span>
                  </div>
                ) : (
                  <div className="flex items-baseline gap-2">
                    <span className="text-body-lg font-semibold text-primary">
                      {total}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      active settlements matched to you
                    </span>
                  </div>
                )}
                <span className="text-sm text-muted-foreground">
                  {Math.min(reviewed, total)} of {total} reviewed
                </span>
              </div>

              <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <motion.div
                  className="h-full rounded-full bg-primary"
                  initial={false}
                  animate={{
                    width: `${(Math.min(reviewed, total) / total) * 100}%`,
                  }}
                  transition={{ type: "spring", stiffness: 260, damping: 30 }}
                />
              </div>
            </>
          ) : null}
        </header>

        {/* Body: loading / error / empty / deck */}
        {status === "loading" ? (
          <LoadingState />
        ) : status === "error" ? (
          <ErrorState />
        ) : total === 0 ? (
          <NoMatchesState />
        ) : (
          <>
            <div className="relative mx-auto h-[34rem] w-full max-w-[26rem]">
              <AnimatePresence>
                {done ? (
                  <EmptyState
                    key="empty"
                    queuedCount={queued.length}
                    queuedPayout={queuedPayout}
                    hasPayout={hasPayout}
                  />
                ) : (
                  deck
                    .map((view, i) => ({ view, i }))
                    .slice(index, index + 3)
                    .reverse()
                    .map(({ view, i }) => {
                      const offset = i - index;
                      return (
                        <SwipeCard
                          key={view.id}
                          view={view}
                          isTop={offset === 0}
                          offset={offset}
                          flyOut={offset === 0 ? flyDir : null}
                          onRequestFly={requestFly}
                          onDecided={commitDecision}
                        />
                      );
                    })
                )}
              </AnimatePresence>
            </div>

            {!done ? (
              <>
                <div className="mt-8 flex items-center justify-center gap-5">
                  <button
                    type="button"
                    onClick={() => requestFly("left")}
                    disabled={!!flyDir}
                    aria-label="Skip this match"
                    className="flex size-16 items-center justify-center rounded-full border border-border bg-card text-destructive shadow-md transition-all hover:scale-105 hover:border-destructive/40 hover:bg-destructive/10 active:scale-95 disabled:pointer-events-none disabled:opacity-50"
                  >
                    <X className="size-7" strokeWidth={2.5} />
                  </button>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleUndo}
                    disabled={history.length === 0 || !!flyDir}
                    className="text-muted-foreground"
                  >
                    <Undo2 className="size-4" />
                    Undo
                  </Button>

                  <button
                    type="button"
                    onClick={() => requestFly("right")}
                    disabled={!!flyDir}
                    aria-label="Queue this claim"
                    className="flex size-16 items-center justify-center rounded-full bg-chart-3 text-white shadow-md transition-all hover:scale-105 hover:brightness-105 active:scale-95 disabled:pointer-events-none disabled:opacity-50"
                  >
                    <Check className="size-7" strokeWidth={2.5} />
                  </button>
                </div>

                <p className="mt-5 text-center text-sm text-muted-foreground">
                  Drag the card, or tap{" "}
                  <X className="inline size-3.5 -translate-y-px text-destructive" />{" "}
                  to skip and{" "}
                  <Check className="inline size-3.5 -translate-y-px text-chart-3" />{" "}
                  to queue.
                </p>
              </>
            ) : null}
          </>
        )}
      </main>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="mx-auto flex h-[34rem] max-w-[26rem] flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-muted/20 text-muted-foreground">
      <Loader2 className="size-6 animate-spin text-primary" />
      <p className="text-sm">Loading your matches…</p>
    </div>
  );
}

function ErrorState() {
  return (
    <div className="mx-auto flex h-[34rem] max-w-[26rem] flex-col items-center justify-center gap-4 rounded-xl border border-border bg-card px-8 text-center">
      <span className="grid size-14 place-items-center rounded-full bg-destructive/10 text-destructive">
        <TriangleAlert className="size-7" />
      </span>
      <div className="space-y-1">
        <h2 className="text-card-title">Couldn&apos;t load matches</h2>
        <p className="text-sm text-muted-foreground">
          The matching service didn&apos;t respond. Try scanning again.
        </p>
      </div>
      <Button asChild variant="outline">
        <Link href="/scan">
          <ScanSearch className="size-4" />
          Run a scan
        </Link>
      </Button>
    </div>
  );
}

function NoMatchesState() {
  return (
    <div className="mx-auto flex h-[34rem] max-w-[26rem] flex-col items-center justify-center gap-4 rounded-xl border border-border bg-card px-8 text-center shadow-sm">
      <span className="grid size-14 place-items-center rounded-full bg-primary/10 text-primary">
        <ScanSearch className="size-7" />
      </span>
      <div className="space-y-1">
        <h2 className="text-card-title">No matches yet</h2>
        <p className="text-sm text-muted-foreground">
          Scan your inbox and we&apos;ll surface every open settlement you
          likely qualify for.
        </p>
      </div>
      <Button asChild size="lg">
        <Link href="/scan">
          Scan for settlements
          <ArrowRight className="size-4" />
        </Link>
      </Button>
    </div>
  );
}

function EmptyState({
  queuedCount,
  queuedPayout,
  hasPayout,
}: {
  queuedCount: number;
  queuedPayout: number;
  hasPayout: boolean;
}) {
  return (
    <motion.div
      className="absolute inset-0 flex flex-col items-center justify-center rounded-xl border border-border/70 bg-card px-8 text-center shadow-lg"
      initial={{ opacity: 0, scale: 0.94, y: 12 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 260, damping: 26 }}
    >
      <motion.div
        initial={{ scale: 0, rotate: -20 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 18, delay: 0.1 }}
        className="mb-5 flex size-16 items-center justify-center rounded-full bg-primary/10 text-primary"
      >
        <PartyPopper className="size-8" />
      </motion.div>

      <h2 className="text-card-title text-foreground">All caught up</h2>
      <p className="mt-2 max-w-xs text-sm text-muted-foreground">
        {queuedCount > 0 ? (
          <>
            You queued{" "}
            <span className="font-semibold text-foreground">
              {queuedCount} claim{queuedCount === 1 ? "" : "s"}
            </span>
            {hasPayout ? (
              <>
                {" "}
                worth about{" "}
                <span className="font-semibold text-primary">
                  {usd(queuedPayout)}
                </span>
              </>
            ) : null}
            . Review them next.
          </>
        ) : (
          "You didn't queue any claims this round. New settlements appear as we scan your inbox."
        )}
      </p>

      {queuedCount > 0 ? (
        <Button asChild size="lg" className="mt-6">
          <Link href="/claims">
            Review claim queue
            <ArrowRight className="size-4" />
          </Link>
        </Button>
      ) : (
        <Button asChild variant="outline" size="lg" className="mt-6">
          <Link href="/scan">Scan again</Link>
        </Button>
      )}
    </motion.div>
  );
}

"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Check,
  X,
  Undo2,
  Sparkles,
  PartyPopper,
  ArrowRight,
} from "lucide-react";

import { Navbar } from "@/components/navbar";
import { Button } from "@/components/ui/button";
import {
  SwipeCard,
  type SwipeDirection,
} from "@/components/matches/swipe-card";
import { matches, getSettlement } from "@/lib/mock-data";
import { usd } from "@/lib/utils";
import type { MatchResult } from "@/lib/types";

type Decision = SwipeDirection;

interface HistoryEntry {
  matchId: string;
  decision: Decision;
}

// Only render matches that have a resolvable settlement.
const deck: MatchResult[] = matches.filter((m) => getSettlement(m.settlementId));

export default function MatchesPage() {
  const [index, setIndex] = useState(0);
  const [queued, setQueued] = useState<string[]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [flyDir, setFlyDir] = useState<Decision | null>(null);

  const total = deck.length;
  const reviewed = index;
  const done = index >= total;

  const queuedPayout = useMemo(
    () =>
      deck
        .filter((m) => queued.includes(m.id))
        .reduce((sum, m) => sum + m.estPayout, 0),
    [queued],
  );

  const remainingPayout = useMemo(
    () => deck.slice(index).reduce((sum, m) => sum + m.estPayout, 0),
    [index],
  );

  const runningTotal = queuedPayout + remainingPayout;

  // A fly-out has been requested (drag past threshold or button). Lock it in
  // so the SwipeCard animates consistently before we advance.
  function requestFly(dir: Decision) {
    if (flyDir || done) return;
    setFlyDir(dir);
  }

  // Called once the top card has finished animating off-screen.
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

          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 pt-1">
            <div className="flex items-baseline gap-2">
              <span className="text-body-lg font-semibold text-primary">
                {usd(runningTotal)}
              </span>
              <span className="text-sm text-muted-foreground">
                estimated across your matches
              </span>
            </div>
            <span className="text-sm text-muted-foreground">
              {Math.min(reviewed, total)} of {total} reviewed
            </span>
          </div>

          {/* Progress bar */}
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <motion.div
              className="h-full rounded-full bg-primary"
              initial={false}
              animate={{
                width: `${total === 0 ? 0 : (Math.min(reviewed, total) / total) * 100}%`,
              }}
              transition={{ type: "spring", stiffness: 260, damping: 30 }}
            />
          </div>
        </header>

        {/* Deck */}
        <div className="relative mx-auto h-[34rem] w-full max-w-[26rem]">
          <AnimatePresence>
            {done ? (
              <EmptyState
                key="empty"
                queuedCount={queued.length}
                queuedPayout={queuedPayout}
              />
            ) : (
              deck
                .map((match, i) => ({ match, i }))
                .slice(index, index + 3)
                .reverse()
                .map(({ match, i }) => {
                  const offset = i - index;
                  const settlement = getSettlement(match.settlementId)!;
                  return (
                    <SwipeCard
                      key={match.id}
                      match={match}
                      settlement={settlement}
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

        {/* Action bar */}
        {!done ? (
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
        ) : null}

        {!done ? (
          <p className="mt-5 text-center text-sm text-muted-foreground">
            Drag the card, or tap{" "}
            <X className="inline size-3.5 -translate-y-px text-destructive" /> to
            skip and{" "}
            <Check className="inline size-3.5 -translate-y-px text-chart-3" /> to
            queue.
          </p>
        ) : null}
      </main>
    </div>
  );
}

function EmptyState({
  queuedCount,
  queuedPayout,
}: {
  queuedCount: number;
  queuedPayout: number;
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
            </span>{" "}
            worth about{" "}
            <span className="font-semibold text-primary">
              {usd(queuedPayout)}
            </span>{" "}
            in estimated payouts.
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
          <Link href="/claims">Go to claims</Link>
        </Button>
      )}
    </motion.div>
  );
}

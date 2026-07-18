"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  motion,
  useMotionValue,
  useTransform,
  AnimatePresence,
} from "framer-motion";
import type { EligibilityRules, MatchResult } from "@/lib/schemas";

type Card = { match: MatchResult; settlement: EligibilityRules };

const SWIPE_THRESHOLD = 120;

export default function MatchDeck() {
  const [cards, setCards] = useState<Card[] | null>(null);
  const [claimed, setClaimed] = useState(0);

  useEffect(() => {
    fetch("/api/match")
      .then((r) => r.json())
      .then((d) => setCards(d.cards ?? []));
  }, []);

  const decide = async (decision: "claim" | "skip") => {
    if (!cards?.length) return;
    const top = cards[0];
    setCards(cards.slice(1));
    if (decision === "claim") setClaimed((n) => n + 1);
    await fetch("/api/match", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ settlementId: top.match.settlementId, decision }),
    });
  };

  if (cards === null)
    return <p className="text-neutral-400">Loading matches…</p>;

  if (cards.length === 0)
    return (
      <div className="text-center">
        <p className="text-2xl font-bold">All done 🎉</p>
        <p className="mt-2 text-neutral-500">
          {claimed > 0
            ? `${claimed} claim${claimed > 1 ? "s" : ""} queued for filing.`
            : "No pending matches. Run `npm run seed` for demo data."}
        </p>
        {claimed > 0 && (
          <Link
            href="/claims"
            className="mt-6 inline-block rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-500"
          >
            Go to claims →
          </Link>
        )}
      </div>
    );

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="relative h-[520px] w-[340px]">
        <AnimatePresence>
          {cards
            .slice(0, 3)
            .toReversed()
            .map((card, i, visible) => (
              <SwipeCard
                key={card.match.settlementId}
                card={card}
                isTop={i === visible.length - 1}
                depth={visible.length - 1 - i}
                onDecide={decide}
              />
            ))}
        </AnimatePresence>
      </div>
      <div className="flex gap-4">
        <button
          onClick={() => decide("skip")}
          className="rounded-full border border-neutral-300 px-8 py-3 font-semibold text-neutral-500 hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-900"
        >
          ✕ Skip
        </button>
        <button
          onClick={() => decide("claim")}
          className="rounded-full bg-green-600 px-8 py-3 font-semibold text-white hover:bg-green-500"
        >
          ✓ Claim it
        </button>
      </div>
    </div>
  );
}

function SwipeCard({
  card,
  isTop,
  depth,
  onDecide,
}: {
  card: Card;
  isTop: boolean;
  depth: number;
  onDecide: (d: "claim" | "skip") => void;
}) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-14, 14]);
  const claimOpacity = useTransform(x, [40, SWIPE_THRESHOLD], [0, 1]);
  const skipOpacity = useTransform(x, [-SWIPE_THRESHOLD, -40], [1, 0]);
  const { settlement: s, match: m } = card;

  return (
    <motion.div
      className="absolute inset-0 flex cursor-grab flex-col overflow-hidden rounded-3xl border border-neutral-200 bg-white p-6 shadow-xl active:cursor-grabbing dark:border-neutral-800 dark:bg-neutral-950"
      style={{ x, rotate }}
      animate={{ scale: 1 - depth * 0.04, y: depth * 12 }}
      exit={{ opacity: 0, transition: { duration: 0.15 } }}
      drag={isTop ? "x" : false}
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.8}
      onDragEnd={(_, info) => {
        if (info.offset.x > SWIPE_THRESHOLD) onDecide("claim");
        else if (info.offset.x < -SWIPE_THRESHOLD) onDecide("skip");
      }}
    >
      {isTop && (
        <>
          <motion.span
            style={{ opacity: claimOpacity }}
            className="absolute left-5 top-5 -rotate-12 rounded-lg border-4 border-green-500 px-3 py-1 text-2xl font-black text-green-500"
          >
            CLAIM
          </motion.span>
          <motion.span
            style={{ opacity: skipOpacity }}
            className="absolute right-5 top-5 rotate-12 rounded-lg border-4 border-red-400 px-3 py-1 text-2xl font-black text-red-400"
          >
            SKIP
          </motion.span>
        </>
      )}

      <p className="text-sm font-medium uppercase tracking-wide text-neutral-400">
        {s.defendant}
      </p>
      <h2 className="mt-1 text-2xl font-bold leading-tight">{s.name}</h2>
      <p className="mt-3 text-4xl font-black text-green-600">
        {s.estPayoutUsd}
      </p>

      <div className="mt-4 flex-1 space-y-3 overflow-y-auto text-sm">
        <div>
          <p className="font-semibold">Why you qualify</p>
          <ul className="mt-1 list-disc space-y-1 pl-5 text-neutral-600 dark:text-neutral-300">
            {m.whyQualified.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        </div>
        {m.uncertainties.length > 0 && (
          <div className="rounded-lg bg-amber-50 p-3 text-amber-800 dark:bg-amber-950 dark:text-amber-200">
            <p className="font-semibold">Worth double-checking</p>
            <ul className="mt-1 list-disc space-y-1 pl-5">
              {m.uncertainties.map((u) => (
                <li key={u}>{u}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="mt-3 flex items-center justify-between text-xs text-neutral-400">
        <span>
          {m.evidence.length > 0
            ? `📎 ${m.evidence.length} receipt${m.evidence.length > 1 ? "s" : ""} found`
            : "No receipt needed"}
        </span>
        <span className="flex items-center gap-2">
          <span
            className={
              m.confidence === "high"
                ? "rounded-full bg-green-100 px-2 py-0.5 font-semibold text-green-700"
                : m.confidence === "medium"
                  ? "rounded-full bg-amber-100 px-2 py-0.5 font-semibold text-amber-700"
                  : "rounded-full bg-neutral-100 px-2 py-0.5 font-semibold text-neutral-500"
            }
          >
            {m.confidence} confidence
          </span>
          {s.deadline && <span>⏳ {s.deadline}</span>}
        </span>
      </div>
    </motion.div>
  );
}

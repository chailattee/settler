"use client";

import { useEffect } from "react";
import {
  motion,
  useMotionValue,
  useTransform,
  animate,
  type PanInfo,
} from "framer-motion";
import { Check, X } from "lucide-react";

import { MatchCard } from "@/components/matches/match-card";
import type { MatchResult, Settlement } from "@/lib/types";

export type SwipeDirection = "left" | "right";

const SWIPE_THRESHOLD = 120;

export function SwipeCard({
  match,
  settlement,
  isTop,
  offset,
  flyOut,
  onRequestFly,
  onDecided,
}: {
  match: MatchResult;
  settlement: Settlement;
  isTop: boolean;
  /** Stack position: 0 = top/active, 1, 2 = behind. */
  offset: number;
  /** When set on the top card, animate it off-screen in that direction. */
  flyOut: SwipeDirection | null;
  onRequestFly: (dir: SwipeDirection) => void;
  onDecided: (dir: SwipeDirection) => void;
}) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-240, 0, 240], [-14, 0, 14]);
  const queueOpacity = useTransform(x, [24, SWIPE_THRESHOLD], [0, 1]);
  const skipOpacity = useTransform(x, [-SWIPE_THRESHOLD, -24], [1, 0]);

  // Programmatic fly-out (triggered by buttons or by a drag past threshold).
  useEffect(() => {
    if (!isTop || !flyOut) return;
    const controls = animate(x, flyOut === "right" ? 640 : -640, {
      type: "spring",
      stiffness: 320,
      damping: 34,
    });
    controls.then(() => onDecided(flyOut));
    return () => controls.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flyOut, isTop]);

  function handleDragEnd(_: unknown, info: PanInfo) {
    const power = info.offset.x + info.velocity.x * 0.12;
    if (power > SWIPE_THRESHOLD) {
      onRequestFly("right");
    } else if (power < -SWIPE_THRESHOLD) {
      onRequestFly("left");
    } else {
      animate(x, 0, { type: "spring", stiffness: 500, damping: 34 });
    }
  }

  return (
    <motion.div
      className="absolute inset-0"
      style={isTop ? { x, rotate } : undefined}
      initial={false}
      animate={{
        scale: 1 - offset * 0.045,
        y: offset * 16,
        opacity: offset > 2 ? 0 : 1,
      }}
      transition={{ type: "spring", stiffness: 300, damping: 32 }}
      drag={isTop && !flyOut ? "x" : false}
      dragElastic={0.6}
      dragConstraints={{ left: 0, right: 0 }}
      onDragEnd={handleDragEnd}
      whileTap={isTop ? { cursor: "grabbing" } : undefined}
    >
      <div
        className={`relative h-full ${isTop ? "cursor-grab active:cursor-grabbing" : "pointer-events-none"}`}
      >
        {/* Decision stamps (top card only) */}
        {isTop ? (
          <>
            <motion.div
              style={{ opacity: queueOpacity }}
              className="pointer-events-none absolute left-5 top-5 z-10 flex items-center gap-1.5 rounded-lg border-2 border-chart-3 bg-chart-3/15 px-3 py-1.5 text-sm font-bold uppercase tracking-wider text-chart-3 shadow-sm -rotate-12"
            >
              <Check className="size-4" strokeWidth={3} />
              Queue
            </motion.div>
            <motion.div
              style={{ opacity: skipOpacity }}
              className="pointer-events-none absolute right-5 top-5 z-10 flex items-center gap-1.5 rounded-lg border-2 border-destructive bg-destructive/10 px-3 py-1.5 text-sm font-bold uppercase tracking-wider text-destructive shadow-sm rotate-12"
            >
              <X className="size-4" strokeWidth={3} />
              Skip
            </motion.div>
          </>
        ) : null}

        <MatchCard match={match} settlement={settlement} />
      </div>
    </motion.div>
  );
}

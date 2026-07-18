"use client";

import { motion } from "framer-motion";
import type { ClaimRun } from "@/lib/types";
import { getSettlement } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import { StatusBadge } from "@/components/claims/status-badge";

export function ClaimRow({
  run,
  selected,
  onSelect,
}: {
  run: ClaimRun;
  selected: boolean;
  onSelect: () => void;
}) {
  const settlement = getSettlement(run.settlementId);

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={cn(
        "group w-full rounded-xl border bg-card p-4 text-left shadow-sm transition-all",
        "hover:border-primary/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        selected
          ? "border-primary ring-1 ring-primary"
          : "border-border",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-card-foreground">
            {settlement?.name ?? run.settlementId}
          </p>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            {settlement?.defendant}
          </p>
        </div>
        <StatusBadge status={run.status} className="shrink-0" />
      </div>

      <div className="mt-3 space-y-1.5">
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <motion.div
            className="h-full rounded-full bg-primary"
            initial={{ width: 0 }}
            animate={{ width: `${run.progress}%` }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          />
        </div>
        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
          <span>
            {run.steps.filter((s) => s.done).length}/{run.steps.length} steps
          </span>
          <span className="tabular-nums">{run.progress}%</span>
        </div>
      </div>
    </button>
  );
}

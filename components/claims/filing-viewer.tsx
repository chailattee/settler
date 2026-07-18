"use client";

import { motion } from "framer-motion";
import {
  Bot,
  CheckCircle2,
  Loader2,
  PlayCircle,
} from "lucide-react";
import type { ClaimRun } from "@/lib/types";
import { getSettlement } from "@/lib/mock-data";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/claims/status-badge";
import { Filmstrip } from "@/components/claims/filmstrip";
import { ApprovalGate } from "@/components/claims/approval-gate";

export function FilingViewer({
  run,
  onStart,
}: {
  run: ClaimRun;
  onStart: (id: string) => void;
}) {
  const settlement = getSettlement(run.settlementId);

  return (
    <motion.div
      key={run.id}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="space-y-5"
    >
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-eyebrow uppercase text-muted-foreground">
            {settlement?.category ?? "Settlement"}
          </p>
          <h2 className="mt-1 text-card-title text-foreground">
            {settlement?.name ?? run.settlementId}
          </h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {settlement?.defendant}
          </p>
        </div>
        <StatusBadge status={run.status} />
      </div>

      {/* Live status banner */}
      {run.status === "filling" && (
        <div className="flex items-center gap-3 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3">
          <div className="relative grid size-9 place-items-center rounded-lg bg-primary/10 text-primary">
            <Bot className="size-5" />
            <Loader2 className="absolute -right-1 -bottom-1 size-4 animate-spin text-primary" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground">
              Agent is filling…
            </p>
            <p className="text-xs text-muted-foreground">
              Entering your details on the claim form.
            </p>
          </div>
          <span className="text-sm font-semibold tabular-nums text-primary">
            {run.progress}%
          </span>
        </div>
      )}

      {run.status === "queued" && (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border bg-muted/30 px-4 py-8 text-center">
          <div className="grid size-11 place-items-center rounded-xl bg-muted text-muted-foreground">
            <PlayCircle className="size-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">
              Waiting in queue
            </p>
            <p className="text-xs text-muted-foreground">
              The agent hasn&apos;t started this claim yet.
            </p>
          </div>
          <Button size="sm" onClick={() => onStart(run.id)}>
            <PlayCircle className="size-4" />
            Start filing
          </Button>
        </div>
      )}

      {run.status === "submitted" && (
        <div className="flex items-center gap-3 rounded-xl border border-chart-3/40 bg-chart-3/5 px-4 py-3">
          <div className="grid size-9 place-items-center rounded-lg bg-chart-3/15 text-chart-3">
            <CheckCircle2 className="size-5" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">
              Filed. Confirmation on its way
            </p>
            <p className="text-xs text-muted-foreground">
              You signed and submitted this claim. Watch your inbox for the
              receipt.
            </p>
          </div>
        </div>
      )}

      {/* Filmstrip */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-muted-foreground">
            Filing progress
          </CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Filmstrip steps={run.steps} />
        </CardContent>
      </Card>

      {/* Approval gate */}
      {run.status === "awaiting_approval" && (
        <ApprovalGate settlement={settlement} />
      )}

      {/* Entered data */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-muted-foreground">
            Data the agent entered
          </CardTitle>
        </CardHeader>
        <CardContent>
          {run.enteredData.length > 0 ? (
            <dl className="divide-y divide-border">
              {run.enteredData.map((field) => (
                <div
                  key={field.label}
                  className="flex items-baseline justify-between gap-4 py-2.5 first:pt-0 last:pb-0"
                >
                  <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                    {field.label}
                  </dt>
                  <dd className="text-right text-sm font-medium text-card-foreground">
                    {field.value}
                  </dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className="py-2 text-sm text-muted-foreground">
              Nothing entered yet. Fields appear here as the agent fills them.
            </p>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ExternalLink, LockKeyhole, PenLine, ShieldCheck } from "lucide-react";
import type { Settlement } from "@/lib/types";
import { Button } from "@/components/ui/button";

export function ApprovalGate({ settlement }: { settlement?: Settlement }) {
  const href = settlement?.claimUrl ?? "#";
  const isInternal = Boolean(settlement?.isMock);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="relative overflow-hidden rounded-xl border-2 border-primary bg-primary/5 p-6 shadow-md"
    >
      <div className="absolute right-0 top-0 h-24 w-24 -translate-y-8 translate-x-8 rounded-full bg-primary/10 blur-2xl" />

      <div className="relative flex items-start gap-4">
        <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground shadow-sm">
          <LockKeyhole className="size-5" />
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-eyebrow uppercase text-primary">
            Human-in-the-loop
          </p>
          <h3 className="mt-1 text-card-title text-card-foreground">
            Paused for your signature
          </h3>
          <p className="mt-2 max-w-prose text-sm leading-relaxed text-muted-foreground">
            The agent reached the certification page and filled every field. It
            will not attest or submit on your behalf — that form is signed{" "}
            <span className="font-medium text-foreground">
              under penalty of perjury
            </span>
            . Review what was entered, then sign and submit yourself.
          </p>

          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            {isInternal ? (
              <Button asChild size="lg">
                <Link href={href}>
                  <ExternalLink className="size-4" />
                  Review &amp; sign on the claim site
                </Link>
              </Button>
            ) : (
              <Button asChild size="lg">
                <a href={href} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="size-4" />
                  Review &amp; sign on the claim site
                </a>
              </Button>
            )}
            <Button variant="outline" size="lg">
              Not now
            </Button>
          </div>

          <div className="mt-5 flex items-center gap-2 rounded-lg bg-background/60 px-3 py-2 text-xs text-muted-foreground">
            <ShieldCheck className="size-4 shrink-0 text-chart-3" />
            <span>
              Claimly never checks the box or clicks submit for you.
            </span>
          </div>
        </div>

        <PenLine className="hidden size-5 shrink-0 text-primary/40 sm:block" />
      </div>
    </motion.div>
  );
}

"use client";

import { Fragment } from "react";
import { motion } from "framer-motion";
import {
  Check,
  CaretRight,
  Globe,
  IdentificationCard,
  Receipt,
  PencilSimpleLine,
  Ticket,
  CalendarBlank,
} from "@phosphor-icons/react/dist/ssr";
import type { Icon } from "@phosphor-icons/react";
import type { ClaimStep, ClaimStepIcon } from "@/lib/types";
import { cn } from "@/lib/utils";

const STEP_ICON: Record<ClaimStepIcon, Icon> = {
  globe: Globe,
  contact: IdentificationCard,
  receipt: Receipt,
  sign: PencilSimpleLine,
  ticket: Ticket,
  calendar: CalendarBlank,
};

export function Filmstrip({ steps }: { steps: ClaimStep[] }) {
  const currentIndex = steps.findIndex((s) => !s.done);

  return (
    <div className="flex flex-wrap items-stretch gap-2">
      {steps.map((step, i) => {
        const isCurrent = i === currentIndex;
        const isDone = step.done;
        const StepIcon = STEP_ICON[step.thumb];

        return (
          <Fragment key={`${step.label}-${i}`}>
            <motion.div
              animate={
                isCurrent
                  ? { scale: [1, 1.03, 1] }
                  : { scale: 1 }
              }
              transition={
                isCurrent
                  ? { duration: 1.6, repeat: Infinity, ease: "easeInOut" }
                  : { duration: 0.2 }
              }
              className={cn(
                "relative flex w-24 flex-col items-center gap-2 rounded-xl border p-3 text-center",
                isDone && "border-chart-3/50 bg-chart-3/5",
                isCurrent &&
                  "border-primary bg-primary/5 shadow-sm ring-1 ring-primary/30",
                !isDone &&
                  !isCurrent &&
                  "border-dashed border-border bg-muted/30 opacity-70",
              )}
            >
              <span
                className={cn(
                  "relative grid size-9 place-items-center rounded-lg",
                  isDone
                    ? "bg-chart-3/15 text-chart-3"
                    : isCurrent
                      ? "bg-primary/10 text-primary"
                      : "bg-muted text-muted-foreground",
                )}
              >
                <StepIcon className="size-5" />
                {isDone && (
                  <span className="absolute -right-1.5 -top-1.5 grid size-4 place-items-center rounded-full bg-chart-3 text-background">
                    <Check className="size-2.5" weight="bold" />
                  </span>
                )}
              </span>
              <span
                className={cn(
                  "text-[11px] font-medium leading-tight",
                  isDone
                    ? "text-card-foreground"
                    : isCurrent
                      ? "text-primary"
                      : "text-muted-foreground",
                )}
              >
                {step.label}
              </span>
              {isCurrent && (
                <span className="text-[10px] font-medium uppercase tracking-wide text-primary">
                  In progress
                </span>
              )}
            </motion.div>

            {i < steps.length - 1 && (
              <div className="flex items-center self-center">
                <CaretRight
                  className={cn(
                    "size-4",
                    isDone ? "text-chart-3" : "text-muted-foreground/40",
                  )}
                />
              </div>
            )}
          </Fragment>
        );
      })}
    </div>
  );
}

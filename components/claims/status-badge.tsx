"use client";

import { CheckCircle, Clock, CircleNotch, PencilSimpleLine } from "@phosphor-icons/react/dist/ssr";
import { Badge } from "@/components/ui/badge";
import type { ClaimStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

type BadgeVariant =
  | "default"
  | "secondary"
  | "accent"
  | "success"
  | "warning"
  | "destructive"
  | "outline";

interface StatusMeta {
  label: string;
  variant: BadgeVariant;
  Icon: typeof Clock;
  spin?: boolean;
}

export const statusMeta: Record<ClaimStatus, StatusMeta> = {
  queued: { label: "Queued", variant: "secondary", Icon: Clock },
  filling: { label: "Filling", variant: "default", Icon: CircleNotch, spin: true },
  awaiting_approval: {
    label: "Needs your signature",
    variant: "warning",
    Icon: PencilSimpleLine,
  },
  submitted: { label: "Submitted", variant: "success", Icon: CheckCircle },
};

export function StatusBadge({
  status,
  className,
}: {
  status: ClaimStatus;
  className?: string;
}) {
  const { label, variant, Icon, spin } = statusMeta[status];
  return (
    <Badge variant={variant} className={cn("gap-1.5", className)}>
      <Icon className={cn("size-3", spin && "animate-spin")} />
      {label}
    </Badge>
  );
}

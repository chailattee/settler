import Link from "next/link";
import { ScanSearch } from "lucide-react";
import { cn } from "@/lib/utils";

export function Logo({
  className,
  href = "/",
}: {
  className?: string;
  href?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex items-center gap-2 font-semibold tracking-tight",
        className,
      )}
      aria-label="Claimly home"
    >
      <span className="grid size-8 place-items-center rounded-lg bg-primary text-primary-foreground shadow-sm">
        <ScanSearch className="size-5" />
      </span>
      <span className="text-lg">Claimly</span>
    </Link>
  );
}

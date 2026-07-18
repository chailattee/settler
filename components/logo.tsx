import Link from "next/link";
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
      className={cn("inline-flex items-center gap-2", className)}
      aria-label="Settlers home"
    >
      <span
        aria-hidden="true"
        className="grid size-8 place-items-center rounded-lg bg-primary text-base shadow-coin"
      >
        🧭
      </span>
      <span className="font-brand text-2xl leading-none">Settlers</span>
    </Link>
  );
}

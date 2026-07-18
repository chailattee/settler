import Link from "next/link";
import { Compass } from "@phosphor-icons/react/dist/ssr";
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
      <span className="grid size-8 place-items-center rounded-lg bg-primary text-primary-foreground shadow-coin">
        <Compass className="size-5" weight="bold" />
      </span>
      <span className="font-brand text-2xl leading-none">Settler</span>
    </Link>
  );
}

import { Logo } from "@/components/logo";

export function Footer() {
  return (
    <footer className="border-t border-border/60 bg-muted/20">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-10 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <Logo />
          <p className="max-w-xs text-sm text-muted-foreground">
            Find the settlement money you&apos;re owed — and let us do the
            paperwork, right up to your signature.
          </p>
        </div>
        <p className="text-xs text-muted-foreground">
          Claimly is a demo. Not legal advice. Read-only Gmail access; raw
          emails are discarded after parsing.
        </p>
      </div>
    </footer>
  );
}

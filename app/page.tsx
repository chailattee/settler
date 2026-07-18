import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { ConnectGmailButton } from "@/components/connect-gmail-button";
import { UploadDropzone } from "@/components/upload-dropzone";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { usd } from "@/lib/utils";

function Glyph({ children, className }: { children: string; className?: string }) {
  return (
    <span aria-hidden="true" className={className}>
      {children}
    </span>
  );
}

const steps = [
  {
    icon: "🗺️",
    title: "Chart your inbox",
    body: "Read-only Gmail access surfaces receipts and order confirmations. We keep the purchase facts and discard the emails.",
  },
  {
    icon: "🏴‍☠️",
    title: "Find the bounties",
    body: "Research agents read each open class action and check its eligibility rules against what you actually bought.",
  },
  {
    icon: "🪙",
    title: "Verify each haul",
    body: "Review every match on a card deck: why you qualify, the evidence, and any doubts. Swipe right to queue the claim.",
  },
  {
    icon: "✍️",
    title: "We file, you sign",
    body: "An agent fills the official claim form for you and stops at the certification page. You put ink to the ledger.",
  },
];

const guardrails = [
  {
    icon: "✋",
    title: "You sign the ledger",
    body: "The agent never checks an attestation box or clicks submit. Claims are signed under penalty of perjury, and that is yours alone.",
  },
  {
    icon: "🔒",
    title: "Read-only Gmail",
    body: "We request the gmail.readonly scope and search only receipt-like mail. No full-inbox dump, no sending, no deleting.",
  },
  {
    icon: "🧹",
    title: "Emails aren't kept",
    body: "Raw messages are parsed into purchase records and then discarded. We keep the facts we need, nothing more.",
  },
];

const haul = [
  { icon: "🔓", label: "Data-breach claims", note: "no proof" },
  { icon: "📦", label: "Product defects", note: "$5–900" },
  { icon: "🔁", label: "Subscription fees", note: "$10–120" },
];

export default function Home() {
  return (
    <div className="flex min-h-dvh flex-col">
      <Navbar />

      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(60%_50%_at_50%_0%,var(--color-primary)/12,transparent_70%)]"
          />
          <div className="mx-auto max-w-6xl px-6 pt-20 pb-16 lg:pt-28">
            <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
              <div className="flex flex-col items-start">
                <Badge variant="accent" className="mb-5">
                  <Glyph>🪙</Glyph>
                  $8.7B in treasure goes unclaimed yearly
                </Badge>
                <h1 className="text-display-md sm:text-display-lg text-balance">
                  There&apos;s gold with your name on it.{" "}
                  <em className="text-accent-foreground not-italic">Claim it.</em>
                </h1>
                <p className="text-body-lg mt-5 max-w-xl text-muted-foreground">
                  Settlers charts your inbox for purchases tied to open
                  class-action settlements, verifies each match, and fills the
                  claim forms. You only sign at the end.
                </p>

                <div className="mt-8 flex flex-col items-start gap-3">
                  <ConnectGmailButton label="Connect Gmail, chart my inbox" />
                  <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Glyph>🔒</Glyph>
                    Read-only access. Receipts and orders only. We never send
                    mail.
                  </p>
                </div>

                <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
                  {["Receipts, not spam", "8 open settlements", "No filing fees"].map(
                    (item) => (
                      <span key={item} className="flex items-center gap-1.5">
                        <Glyph className="text-chart-3">✓</Glyph>
                        {item}
                      </span>
                    ),
                  )}
                </div>
              </div>

              {/* Hero visual: the ledger / haul card */}
              <div className="relative">
                <Card className="relative z-10 shadow-lg">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between border-b-2 border-dashed border-border pb-3">
                      <span className="font-serif text-lg italic text-accent-foreground">
                        The average haul
                      </span>
                      <span className="text-eyebrow uppercase text-muted-foreground">
                        last 30 days
                      </span>
                    </div>
                    <div className="mt-4 font-mono text-5xl tracking-tight text-accent-foreground">
                      {usd(1240)}
                    </div>
                    <p className="font-serif italic text-muted-foreground">
                      found and filed per crew member
                    </p>

                    <div className="mt-5 space-y-2.5">
                      {haul.map((row) => (
                        <div
                          key={row.label}
                          className="flex items-center gap-3 rounded-lg border border-border/70 bg-background/60 px-3 py-2.5"
                        >
                          <Glyph className="grid size-8 shrink-0 place-items-center rounded-md bg-accent text-lg">
                            {row.icon}
                          </Glyph>
                          <p className="min-w-0 flex-1 truncate text-sm font-medium">
                            {row.label}
                          </p>
                          <span className="font-mono text-sm font-bold text-chart-3">
                            {row.note}
                          </span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
                <div
                  aria-hidden
                  className="absolute -right-6 -top-6 -z-0 hidden size-40 rounded-full bg-primary/15 blur-2xl lg:block"
                />
              </div>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="border-t border-border/60 bg-muted/20">
          <div className="mx-auto max-w-6xl px-6 py-16 lg:py-20">
            <div className="max-w-2xl">
              <span className="text-eyebrow uppercase text-primary">
                The voyage
              </span>
              <h2 className="text-headline mt-2">
                From inbox to filed claim in four steps
              </h2>
            </div>
            <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {steps.map((step, i) => (
                <Card key={step.title} className="h-full">
                  <CardContent className="flex h-full flex-col p-5">
                    <div className="flex items-center justify-between">
                      <Glyph className="grid size-10 place-items-center rounded-lg bg-primary/15 text-xl">
                        {step.icon}
                      </Glyph>
                      <span className="text-eyebrow font-mono text-muted-foreground">
                        0{i + 1}
                      </span>
                    </div>
                    <h3 className="mt-4 font-serif text-xl">{step.title}</h3>
                    <p className="mt-1.5 text-sm text-muted-foreground">
                      {step.body}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Evidence paths */}
        <section className="mx-auto max-w-6xl px-6 py-16 lg:py-20">
          <div className="max-w-2xl">
            <span className="text-eyebrow uppercase text-primary">
              Load your evidence
            </span>
            <h2 className="text-headline mt-2">
              Connect Gmail, or bring your own receipts
            </h2>
            <p className="mt-3 text-muted-foreground">
              Gmail is the fastest route. One click and we find the receipts.
              Prefer to stay hands on the wheel? Drop in files instead.
            </p>
          </div>

          <div className="mt-10 grid gap-6 lg:grid-cols-2">
            <Card className="relative overflow-hidden">
              <div className="absolute right-4 top-4">
                <Badge>Recommended</Badge>
              </div>
              <CardContent className="flex h-full flex-col p-6">
                <Glyph className="grid size-11 place-items-center rounded-lg bg-primary text-xl shadow-coin">
                  ⚓
                </Glyph>
                <h3 className="text-card-title mt-4">Connect Gmail</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">
                  We search receipt-like mail (order confirmations, invoices)
                  and turn it into purchase records. Read-only, and nothing is
                  kept.
                </p>
                <div className="mt-6">
                  <ConnectGmailButton label="Connect Gmail" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="flex h-full flex-col p-6">
                <Glyph className="grid size-11 place-items-center rounded-lg bg-secondary text-xl">
                  📎
                </Glyph>
                <h3 className="text-card-title mt-4">Upload receipts</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">
                  A fallback for anything not in your inbox. PDFs, photos, and
                  statements are parsed the same way.
                </p>
                <div className="mt-6">
                  <UploadDropzone />
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Guardrails */}
        <section className="border-t border-border/60 bg-muted/20">
          <div className="mx-auto max-w-6xl px-6 py-16 lg:py-20">
            <div className="max-w-2xl">
              <span className="text-eyebrow uppercase text-primary">
                Sailing by the code
              </span>
              <h2 className="text-headline mt-2">
                You stay in command of every signature
              </h2>
            </div>
            <div className="mt-10 grid gap-5 md:grid-cols-3">
              {guardrails.map((g) => (
                <div
                  key={g.title}
                  className="rounded-xl border border-border bg-card p-6"
                >
                  <Glyph className="grid size-10 place-items-center rounded-lg bg-chart-3/15 text-xl">
                    {g.icon}
                  </Glyph>
                  <h3 className="mt-4 font-serif text-xl">{g.title}</h3>
                  <p className="mt-1.5 text-sm text-muted-foreground">
                    {g.body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="mx-auto max-w-6xl px-6 py-16 lg:py-24">
          <div className="dark relative overflow-hidden rounded-2xl border border-border bg-background px-6 py-14 text-center text-foreground sm:px-12">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 bg-[radial-gradient(50%_60%_at_50%_0%,var(--color-primary)/18,transparent_70%)]"
            />
            <h2 className="text-headline relative">
              See your haul in about a minute
            </h2>
            <p className="relative mx-auto mt-3 max-w-xl text-muted-foreground">
              Connect your inbox and Settlers will surface every settlement you
              likely qualify for. No filing fees, no obligation.
            </p>
            <div className="relative mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <ConnectGmailButton />
              <Link
                href="/scan?demo=1"
                className="inline-flex h-12 items-center gap-2 rounded-lg border border-border px-6 text-base font-medium transition-colors hover:bg-muted"
              >
                See a demo run <Glyph>→</Glyph>
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

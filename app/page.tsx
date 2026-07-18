import Link from "next/link";
import {
  ScanSearch,
  Sparkles,
  Layers,
  PenLine,
  ShieldCheck,
  Lock,
  Trash2,
  ArrowRight,
  Mail,
  Check,
} from "lucide-react";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { ConnectGmailButton } from "@/components/connect-gmail-button";
import { UploadDropzone } from "@/components/upload-dropzone";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { matches, getSettlement } from "@/lib/mock-data";
import { usd } from "@/lib/utils";

const totalFound = matches.reduce((sum, m) => sum + m.estPayout, 0);

const steps = [
  {
    icon: ScanSearch,
    title: "Scan your inbox",
    body: "Read-only Gmail access surfaces receipts and order confirmations. We keep the purchase facts and discard the emails.",
  },
  {
    icon: Sparkles,
    title: "Match settlements",
    body: "AI reads each open class-action's eligibility rules and checks them against what you actually bought.",
  },
  {
    icon: Layers,
    title: "Swipe to verify",
    body: "Review each match on a card deck — why you qualify, the evidence, and any uncertainties. Swipe right to queue it.",
  },
  {
    icon: PenLine,
    title: "We file, you sign",
    body: "An agent fills the official claim form for you and stops at the certification page. You review and sign.",
  },
];

const guardrails = [
  {
    icon: ShieldCheck,
    title: "Human-in-the-loop by design",
    body: "The agent never checks an attestation box or clicks submit. Claims are signed under penalty of perjury — that's yours to do.",
  },
  {
    icon: Lock,
    title: "Read-only Gmail",
    body: "We request the gmail.readonly scope and search only receipt-like mail. No full-inbox dump, no sending, no deleting.",
  },
  {
    icon: Trash2,
    title: "Emails aren't stored",
    body: "Raw messages are parsed into purchase records and then discarded. We keep the facts we need, nothing more.",
  },
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
            className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(60%_50%_at_50%_0%,var(--color-accent)/25,transparent_70%)]"
          />
          <div className="mx-auto max-w-6xl px-6 pt-20 pb-16 lg:pt-28">
            <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
              <div className="flex flex-col items-start">
                <Badge variant="accent" className="mb-5">
                  <Sparkles className="size-3.5" />
                  Class-action money finder
                </Badge>
                <h1 className="text-display-md sm:text-display-lg text-balance">
                  Find the settlement money you&apos;re owed.
                </h1>
                <p className="text-body-lg mt-5 max-w-xl text-muted-foreground">
                  Billions in class-action settlements go unclaimed every year.
                  Claimly scans your inbox, matches you to open settlements, and
                  files the paperwork — stopping at your signature.
                </p>

                <div className="mt-8 flex flex-col items-start gap-3">
                  <ConnectGmailButton />
                  <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Lock className="size-3.5" />
                    Read-only access. Cancel anytime. No inbox is ever stored.
                  </p>
                </div>

                <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
                  {["Receipts, not spam", "8 live settlements", "No filing fees"].map(
                    (item) => (
                      <span key={item} className="flex items-center gap-1.5">
                        <Check className="size-4 text-chart-3" />
                        {item}
                      </span>
                    ),
                  )}
                </div>
              </div>

              {/* Hero visual: found-money card */}
              <div className="relative">
                <Card className="relative z-10 shadow-lg">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <span className="text-eyebrow uppercase text-muted-foreground">
                        Estimated for you
                      </span>
                      <Badge variant="success">
                        <span className="relative flex size-2">
                          <span className="absolute inline-flex size-full animate-ping rounded-full bg-chart-3/60" />
                          <span className="relative inline-flex size-2 rounded-full bg-chart-3" />
                        </span>
                        Live
                      </Badge>
                    </div>
                    <div className="text-display-md mt-2 text-primary">
                      {usd(totalFound)}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      across {matches.length} matched settlements
                    </p>

                    <div className="mt-5 space-y-2.5">
                      {matches.slice(0, 4).map((m) => {
                        const s = getSettlement(m.settlementId);
                        if (!s) return null;
                        return (
                          <div
                            key={m.id}
                            className="flex items-center gap-3 rounded-lg border border-border/70 bg-background/60 px-3 py-2.5"
                          >
                            <span className="grid size-8 shrink-0 place-items-center rounded-md bg-accent/50 text-accent-foreground">
                              <Mail className="size-4" />
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium">
                                {s.name}
                              </p>
                              <p className="truncate text-xs text-muted-foreground">
                                {s.category} · {Math.round(m.confidence * 100)}%
                                match
                              </p>
                            </div>
                            <span className="text-sm font-semibold text-primary">
                              {usd(m.estPayout)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
                <div
                  aria-hidden
                  className="absolute -right-6 -top-6 -z-0 hidden size-40 rounded-full bg-primary/10 blur-2xl lg:block"
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
                How it works
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
                      <span className="grid size-10 place-items-center rounded-lg bg-primary/10 text-primary">
                        <step.icon className="size-5" />
                      </span>
                      <span className="text-eyebrow text-muted-foreground">
                        0{i + 1}
                      </span>
                    </div>
                    <h3 className="mt-4 font-semibold">{step.title}</h3>
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
              Bring your evidence
            </span>
            <h2 className="text-headline mt-2">
              Connect Gmail, or upload receipts yourself
            </h2>
            <p className="mt-3 text-muted-foreground">
              Gmail is the fastest path — one click and we find the receipts.
              Prefer to stay hands-on? Drop in files instead.
            </p>
          </div>

          <div className="mt-10 grid gap-6 lg:grid-cols-2">
            <Card className="relative overflow-hidden">
              <div className="absolute right-4 top-4">
                <Badge>Recommended</Badge>
              </div>
              <CardContent className="flex h-full flex-col p-6">
                <span className="grid size-11 place-items-center rounded-lg bg-primary text-primary-foreground">
                  <Mail className="size-5" />
                </span>
                <h3 className="text-card-title mt-4">Connect Gmail</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">
                  We search receipt-like mail (order confirmations, invoices)
                  and turn them into purchase records. Read-only, and nothing is
                  stored.
                </p>
                <div className="mt-6">
                  <ConnectGmailButton label="Connect Gmail" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="flex h-full flex-col p-6">
                <span className="grid size-11 place-items-center rounded-lg bg-secondary text-secondary-foreground">
                  <Layers className="size-5" />
                </span>
                <h3 className="text-card-title mt-4">Upload receipts</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">
                  Fallback for anything not in your inbox. PDFs, photos, and
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
                Built to be trusted
              </span>
              <h2 className="text-headline mt-2">
                You stay in control of every signature
              </h2>
            </div>
            <div className="mt-10 grid gap-5 md:grid-cols-3">
              {guardrails.map((g) => (
                <div
                  key={g.title}
                  className="rounded-xl border border-border bg-card p-6"
                >
                  <span className="grid size-10 place-items-center rounded-lg bg-chart-3/15 text-chart-3">
                    <g.icon className="size-5" />
                  </span>
                  <h3 className="mt-4 font-semibold">{g.title}</h3>
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
          <div className="relative overflow-hidden rounded-2xl border border-border bg-primary px-6 py-14 text-center text-primary-foreground sm:px-12">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 bg-[radial-gradient(50%_60%_at_50%_0%,#fff2,transparent_70%)]"
            />
            <h2 className="text-headline relative">
              See what you&apos;re owed in about a minute
            </h2>
            <p className="relative mx-auto mt-3 max-w-xl text-primary-foreground/80">
              Connect your inbox and Claimly will surface every settlement you
              likely qualify for. No filing fees, no obligation.
            </p>
            <div className="relative mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <ConnectGmailButton className="bg-background text-foreground shadow-none hover:bg-background/90" />
              <Link
                href="/matches"
                className="inline-flex h-12 items-center gap-2 rounded-lg border border-primary-foreground/30 px-6 text-base font-medium transition-colors hover:bg-primary-foreground/10"
              >
                See a demo
                <ArrowRight className="size-4" />
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

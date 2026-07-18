"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  Copy,
  Check,
  ArrowSquareOut,
  ClipboardText,
  Warning,
  EnvelopeSimple,
} from "@phosphor-icons/react/dist/ssr";
import { Navbar } from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  fetchClaims,
  fetchProfile,
  saveProfile,
  type ClaimView,
  type Profile,
} from "@/lib/api";

type LoadState = "loading" | "error" | "ready";

const SUBMIT_META: Record<
  ClaimView["submitType"],
  { label: string; variant: "success" | "accent" | "secondary"; cta: string }
> = {
  claim: { label: "Claim open", variant: "success", cta: "File your claim" },
  interest: { label: "Register interest", variant: "accent", cta: "Register your interest" },
  watch: { label: "Watching", variant: "secondary", cta: "" },
};

export default function ClaimsPage() {
  const [claims, setClaims] = useState<ClaimView[]>([]);
  const [status, setStatus] = useState<LoadState>("loading");
  const [selectedId, setSelectedId] = useState<string>("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = await fetchClaims();
        if (cancelled) return;
        setClaims(list);
        setSelectedId((id) => id || list[0]?.id || "");
        setStatus("ready");
      } catch {
        if (!cancelled) setStatus("error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const selected = useMemo(
    () => claims.find((c) => c.id === selectedId) ?? claims[0],
    [claims, selectedId],
  );

  const stats = useMemo(() => {
    const open = claims.filter((c) => c.submitType === "claim").length;
    const interest = claims.filter((c) => c.submitType === "interest").length;
    const watching = claims.filter((c) => c.submitType === "watch").length;
    return { open, interest, watching };
  }, [claims]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="mx-auto max-w-6xl px-6 py-10">
        <header>
          <p className="text-eyebrow uppercase text-primary">Auto-filing</p>
          <h1 className="mt-1 text-headline text-foreground">Your claim queue</h1>
          <p className="mt-2 max-w-2xl text-body-lg text-muted-foreground">
            We find where to act — an open settlement claim form, or a sign-up to
            register interest in an ongoing case — and pre-fill your details. You
            review, then attest and submit yourself.
          </p>

          <dl className="mt-6 grid grid-cols-3 gap-3">
            <Stat label="Claims open" value={String(stats.open)} emphasis />
            <Stat label="Interest sign-ups" value={String(stats.interest)} />
            <Stat label="Watching" value={String(stats.watching)} />
          </dl>
        </header>

        <div className="mt-6 flex items-start gap-3 rounded-xl bg-secondary/50 px-4 py-3">
          <ShieldCheck className="mt-0.5 size-5 shrink-0 text-primary" />
          <p className="text-sm text-secondary-foreground">
            <span className="font-semibold">Human-in-the-loop:</span> Settlers
            pre-fills every field but never attests or submits. You sign and file.
          </p>
        </div>

        <ProfileCard />

        {status === "loading" && (
          <p className="mt-10 text-sm text-muted-foreground">Loading your claims…</p>
        )}
        {status === "error" && (
          <p className="mt-10 text-sm text-destructive">Couldn&apos;t load claims.</p>
        )}
        {status === "ready" && claims.length === 0 && (
          <div className="mt-10 grid place-items-center gap-2 rounded-xl border border-dashed border-border py-16 text-center">
            <p className="text-sm font-medium text-foreground">No claims queued yet</p>
            <p className="max-w-sm text-sm text-muted-foreground">
              Swipe right on a match to queue it here — we&apos;ll find the claim
              or sign-up link and pre-fill it.
            </p>
            <Button asChild size="sm" className="mt-2">
              <Link href="/matches">Review matches</Link>
            </Button>
          </div>
        )}

        {status === "ready" && claims.length > 0 && (
          <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,22rem)_1fr]">
            <section aria-label="Claim queue" className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <h2 className="text-sm font-semibold text-muted-foreground">Queue</h2>
                <span className="text-xs text-muted-foreground">{claims.length} claims</span>
              </div>
              <div className="space-y-3">
                {claims.map((c) => (
                  <ClaimRow
                    key={c.id}
                    claim={c}
                    selected={c.id === selected?.id}
                    onSelect={() => setSelectedId(c.id)}
                  />
                ))}
              </div>
            </section>

            <section aria-label="Claim detail">
              {selected ? (
                <ClaimDetail claim={selected} />
              ) : (
                <div className="grid h-40 place-items-center rounded-xl border border-dashed border-border text-sm text-muted-foreground">
                  Select a claim.
                </div>
              )}
            </section>
          </div>
        )}
      </main>
    </div>
  );
}

function ClaimRow({
  claim,
  selected,
  onSelect,
}: {
  claim: ClaimView;
  selected: boolean;
  onSelect: () => void;
}) {
  const meta = SUBMIT_META[claim.submitType];
  return (
    <button
      onClick={onSelect}
      className={`w-full rounded-xl border p-4 text-left transition-colors ${
        selected ? "border-primary/50 bg-card shadow-sm" : "border-border bg-card/60 hover:bg-card"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-card-foreground">{claim.title}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{claim.brand}</p>
        </div>
        <Badge variant={meta.variant}>{meta.label}</Badge>
      </div>
    </button>
  );
}

function ClaimDetail({ claim }: { claim: ClaimView }) {
  const meta = SUBMIT_META[claim.submitType];
  const [copied, setCopied] = useState(false);

  async function copyPacket() {
    try {
      await navigator.clipboard.writeText(claim.packet);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard blocked */
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-eyebrow uppercase text-muted-foreground">{claim.brand}</p>
          <h2 className="mt-1 text-card-title text-foreground">{claim.title}</h2>
          {claim.deadline && (
            <p className="mt-0.5 text-sm text-muted-foreground">Deadline: {claim.deadline}</p>
          )}
        </div>
        <Badge variant={meta.variant}>{meta.label}</Badge>
      </div>

      {claim.instructions && (
        <p className="text-sm text-muted-foreground">{claim.instructions}</p>
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-3">
        {claim.submitUrl && claim.submitType !== "watch" && (
          <Button asChild>
            <a href={claim.submitUrl} target="_blank" rel="noopener noreferrer">
              {meta.cta}
              <ArrowSquareOut className="size-4" />
            </a>
          </Button>
        )}
        {!claim.submitUrl && claim.draftUrl && (
          <Button asChild>
            <a href={claim.draftUrl} target="_blank" rel="noopener noreferrer">
              <EnvelopeSimple className="size-4" />
              Review email draft
            </a>
          </Button>
        )}
        <Button variant="outline" onClick={copyPacket}>
          {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
          {copied ? "Copied" : "Copy details"}
        </Button>
      </div>

      {!claim.submitUrl && claim.draftUrl && (
        <p className="text-xs text-muted-foreground">
          No online form yet — we drafted a follow-up email in your Gmail to
          register interest. Review and send it when you&apos;re ready.
        </p>
      )}

      {/* Autofilled fields */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-muted-foreground">
            Pre-filled for you
          </CardTitle>
        </CardHeader>
        <CardContent>
          {claim.enteredData.length > 0 ? (
            <dl className="divide-y divide-border">
              {claim.enteredData.map((f) => (
                <div
                  key={f.label}
                  className="flex items-baseline justify-between gap-4 py-2.5 first:pt-0 last:pb-0"
                >
                  <dt className="text-xs uppercase tracking-wide text-muted-foreground">{f.label}</dt>
                  <dd className="text-right text-sm font-medium text-card-foreground">{f.value}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className="py-2 text-sm text-muted-foreground">Nothing to pre-fill yet.</p>
          )}
        </CardContent>
      </Card>

      {/* Missing */}
      {claim.missing.length > 0 && (
        <div className="flex items-start gap-3 rounded-xl border border-chart-4/40 bg-chart-4/10 px-4 py-3">
          <Warning className="mt-0.5 size-5 shrink-0 text-amber-600 dark:text-amber-400" />
          <div>
            <p className="text-sm font-medium text-foreground">You still need to add</p>
            <p className="mt-0.5 text-sm text-muted-foreground">{claim.missing.join(", ")}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Fill your details above so we can pre-fill these next time.
            </p>
          </div>
        </div>
      )}

      {/* Packet */}
      <Card>
        <CardHeader className="flex-row items-center justify-between gap-2 pb-3">
          <CardTitle className="flex items-center gap-1.5 text-sm font-semibold text-muted-foreground">
            <ClipboardText className="size-4" />
            Copy-paste packet
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={copyPacket}>
            {copied ? "Copied" : "Copy"}
          </Button>
        </CardHeader>
        <CardContent>
          <pre className="overflow-x-auto whitespace-pre-wrap break-words rounded-lg bg-muted/50 p-3 text-xs text-card-foreground">
            {claim.packet}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}

function ProfileCard() {
  const [profile, setProfile] = useState<Profile>({ name: "", email: "", phone: "", address: "" });
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchProfile()
      .then(setProfile)
      .catch(() => {});
  }, []);

  async function onSave() {
    setSaving(true);
    try {
      await saveProfile(profile);
      setSaved(true);
      setTimeout(() => setSaved(false), 1800);
    } finally {
      setSaving(false);
    }
  }

  const set = (k: keyof Profile) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setProfile((p) => ({ ...p, [k]: e.target.value }));

  return (
    <Card className="mt-6">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold text-muted-foreground">
          Your details for autofill
        </CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Full name">
          <Input value={profile.name} onChange={set("name")} placeholder="Jordan Smith" />
        </Field>
        <Field label="Email">
          <Input value={profile.email} onChange={set("email")} placeholder="you@example.com" />
        </Field>
        <Field label="Phone">
          <Input value={profile.phone} onChange={set("phone")} placeholder="(555) 555-0100" />
        </Field>
        <Field label="Mailing address">
          <Input value={profile.address} onChange={set("address")} placeholder="123 Main St, City, ST" />
        </Field>
        <div className="sm:col-span-2">
          <Button size="sm" onClick={onSave} disabled={saving}>
            {saved ? "Saved" : saving ? "Saving…" : "Save details"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs uppercase tracking-wide text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

function Stat({ label, value, emphasis }: { label: string; value: string; emphasis?: boolean }) {
  return (
    <div
      className={`rounded-xl border bg-card p-4 shadow-sm ${
        emphasis ? "border-primary/40" : "border-border"
      }`}
    >
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd
        className={`mt-1.5 text-2xl font-semibold tabular-nums ${
          emphasis ? "text-primary" : "text-card-foreground"
        }`}
      >
        {value}
      </dd>
    </div>
  );
}

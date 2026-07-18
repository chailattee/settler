// Swipe deck: one card per MatchResult (framer-motion drag). Right = queue claim, left = skip.
// TODO: fetch GET /api/match, render cards with payout, why-qualified bullets, evidence, uncertainties.
export default function MatchesPage() {
  return (
    <main className="flex min-h-screen items-center justify-center p-8">
      <div className="flex h-[480px] w-80 items-center justify-center rounded-2xl border border-dashed border-neutral-400 text-neutral-400">
        swipe deck goes here
      </div>
    </main>
  );
}

// FAKE "DemoCorp Data Breach" settlement claim site — local target for the
// filing-agent demo. TODO: 3-step form (contact -> purchase details ->
// certification page with attest checkbox + submit).
export default function MockClaimPage() {
  return (
    <main className="mx-auto min-h-screen max-w-xl p-8">
      <h1 className="text-2xl font-bold">
        DemoCorp Data Breach Settlement — Claim Form
      </h1>
      <p className="mt-2 text-sm text-neutral-500">
        This is a demo site. It is not a real settlement.
      </p>
      <div className="mt-8 rounded-xl border border-dashed border-neutral-400 p-12 text-center text-neutral-400">
        3-step claim form goes here
      </div>
    </main>
  );
}

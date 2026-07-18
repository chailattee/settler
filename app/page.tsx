import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center gap-8 p-8 text-center">
      <h1 className="text-5xl font-bold tracking-tight">ClaimSwipe</h1>
      <p className="text-lg text-neutral-500">
        Find class action settlements you&apos;re owed money from — and file
        the claim for you.
      </p>

      <div className="flex w-full flex-col gap-3">
        {/* OWNER: teammate — wire to Google OAuth + POST /api/gmail-scan */}
        <button className="rounded-xl bg-blue-600 px-6 py-4 text-lg font-semibold text-white hover:bg-blue-500">
          Connect Gmail &amp; scan for receipts
        </button>
        {/* OWNER: teammate — dropzone posting to /api/upload */}
        <button className="rounded-xl border border-neutral-300 px-6 py-4 text-lg font-semibold hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-900">
          Upload receipts instead
        </button>
      </div>

      <nav className="flex gap-6 text-sm text-neutral-400">
        <Link href="/matches" className="hover:underline">
          Matches →
        </Link>
        <Link href="/claims" className="hover:underline">
          Claims →
        </Link>
        <Link href="/mock-claim" className="hover:underline">
          Mock claim site →
        </Link>
      </nav>
    </main>
  );
}

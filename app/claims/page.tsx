// Claim queue + live filing viewer: polls GET /api/claim, renders step screenshots
// as a filmstrip, and shows the approval gate when status === "awaiting_approval".
export default function ClaimsPage() {
  return (
    <main className="mx-auto min-h-screen max-w-3xl p-8">
      <h1 className="text-2xl font-bold">Your claims</h1>
      <p className="mt-2 text-neutral-500">
        Queued claims and live filing progress will show here.
      </p>
    </main>
  );
}

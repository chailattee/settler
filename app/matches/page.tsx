import MatchDeck from "./deck";

export default function MatchesPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 p-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold">Your matches</h1>
        <p className="mt-1 text-neutral-500">
          Swipe right to claim, left to skip.
        </p>
      </div>
      <MatchDeck />
    </main>
  );
}

"use client";

import { FormEvent, useState } from "react";

type TurnResponse = {
  gameId: string;
  turnNumber: number;
  narrative: string;
  error?: string;
};

export default function TurnPage() {
  const [gameId, setGameId] = useState("");
  const [playerInput, setPlayerInput] = useState(
    "Strengthen border defenses and pressure a neighboring rival through diplomacy.",
  );
  const [result, setResult] = useState<TurnResponse | null>(null);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError("");

    try {
      const response = await fetch("/api/turn", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          gameId: gameId || undefined,
          playerInput,
        }),
      });

      const data = (await response.json()) as TurnResponse;

      if (!response.ok) {
        setResult(null);
        setError(data.error ?? "Turn request failed");
        return;
      }

      setResult(data);
      setGameId(data.gameId);
    } catch {
      setResult(null);
      setError("Request failed before the server responded.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-8 px-6 py-12">
      <header className="space-y-3">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-zinc-500">
          Histar Test Loop
        </p>
        <h1 className="text-4xl font-semibold tracking-tight text-zinc-950">
          Run a turn against the first game route
        </h1>
        <p className="max-w-2xl text-base leading-7 text-zinc-600">
          Leave the game ID blank to create a fresh game. Reuse the returned game
          ID to keep advancing the same session.
        </p>
      </header>

      <form className="space-y-5 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm" onSubmit={handleSubmit}>
        <label className="block space-y-2">
          <span className="text-sm font-medium text-zinc-800">Game ID</span>
          <input
            className="w-full rounded-xl border border-zinc-300 px-4 py-3 text-sm outline-none transition focus:border-zinc-900"
            value={gameId}
            onChange={(event) => setGameId(event.target.value)}
            placeholder="Leave blank to create a new game"
          />
        </label>

        <label className="block space-y-2">
          <span className="text-sm font-medium text-zinc-800">Player action</span>
          <textarea
            className="min-h-40 w-full rounded-xl border border-zinc-300 px-4 py-3 text-sm outline-none transition focus:border-zinc-900"
            value={playerInput}
            onChange={(event) => setPlayerInput(event.target.value)}
          />
        </label>

        <button
          className="rounded-full bg-zinc-950 px-5 py-3 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-400"
          disabled={isSubmitting}
          type="submit"
        >
          {isSubmitting ? "Running turn..." : "Run turn"}
        </button>
      </form>

      {error ? (
        <section className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
          {error}
        </section>
      ) : null}

      {result ? (
        <section className="space-y-4 rounded-2xl border border-zinc-200 bg-zinc-50 p-6">
          <div className="grid gap-3 text-sm text-zinc-600 sm:grid-cols-2">
            <p>
              <span className="font-medium text-zinc-900">Game ID:</span> {result.gameId}
            </p>
            <p>
              <span className="font-medium text-zinc-900">Turn:</span> {result.turnNumber}
            </p>
          </div>
          <div className="space-y-2">
            <h2 className="text-lg font-semibold text-zinc-950">Narrative</h2>
            <p className="leading-7 text-zinc-700">{result.narrative}</p>
          </div>
        </section>
      ) : null}
    </main>
  );
}

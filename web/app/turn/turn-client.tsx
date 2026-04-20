"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";

import type { EndingSummary, GameState, StateDelta, TurnEvent } from "@/lib/game";

type TurnResponse = {
  gameId: string;
  turnNumber: number;
  turnCap?: number;
  gameOver?: boolean;
  narrative: string;
  deltas: StateDelta[];
  events: TurnEvent[];
  state: GameState;
  ending?: EndingSummary | null;
  cliffhanger?: string | null;
  error?: string;
};

export default function TurnClientPage({
  initialGameId,
  recap,
}: {
  initialGameId: string;
  recap: string | null;
}) {
  const [gameId, setGameId] = useState(initialGameId);
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
          Histra Test Loop
        </p>
        <h1 className="text-4xl font-semibold tracking-tight text-zinc-950">
          Run a turn against the first game route
        </h1>
        <p className="max-w-2xl text-base leading-7 text-zinc-600">
          Leave the game ID blank to create a fresh game. Reuse the returned game
          ID to keep advancing the same session.
        </p>
        <div className="flex flex-wrap gap-3 pt-2">
          <Link
            href="/games"
            className="inline-flex items-center justify-center rounded-full border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 transition hover:border-zinc-950 hover:text-zinc-950"
          >
            View Saved Games
          </Link>
        </div>
      </header>

      {recap ? (
        <section className="rounded-2xl border border-zinc-200 bg-zinc-50 p-6">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-zinc-500">
            Since you last played
          </p>
          <p className="mt-3 leading-7 text-zinc-700">{recap}</p>
        </section>
      ) : null}

      <form
        className="space-y-5 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm"
        onSubmit={handleSubmit}
      >
        <label className="block space-y-2">
          <span className="text-sm font-medium text-zinc-800">Game ID</span>
          <input
            className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-950 outline-none transition placeholder:text-zinc-400 focus:border-zinc-900"
            value={gameId}
            onChange={(event) => setGameId(event.target.value)}
            placeholder="Leave blank to create a new game"
          />
        </label>

        <label className="block space-y-2">
          <span className="text-sm font-medium text-zinc-800">Player action</span>
          <textarea
            className="min-h-40 w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-950 outline-none transition placeholder:text-zinc-400 focus:border-zinc-900"
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
              {result.turnCap ? ` / ${result.turnCap}` : ""}
            </p>
          </div>
          {result.gameOver ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              This game has reached its turn cap. Start a new game or use the current state
              as the basis for an ending.
            </div>
          ) : null}
          <div className="flex flex-wrap gap-3">
            <Link
              href={`/games/${result.gameId}`}
              className="inline-flex items-center justify-center rounded-full border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 transition hover:border-zinc-950 hover:text-zinc-950"
            >
              Open Game Detail
            </Link>
            <Link
              href={`/games/${result.gameId}/chronicle`}
              className="inline-flex items-center justify-center rounded-full border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 transition hover:border-zinc-950 hover:text-zinc-950"
            >
              Open Chronicle
            </Link>
          </div>
          <div className="space-y-2">
            <h2 className="text-lg font-semibold text-zinc-950">Objective</h2>
            <div className="rounded-xl bg-white px-4 py-3 text-sm text-zinc-700">
              <p className="font-medium text-zinc-950">{result.state.objective.title}</p>
              <p>{result.state.objective.description}</p>
              <p className="mt-2 text-zinc-500">
                Target: {result.state.objective.key} {result.state.objective.target}
              </p>
            </div>
          </div>
          <div className="space-y-2">
            <h2 className="text-lg font-semibold text-zinc-950">Ruler</h2>
            <div className="rounded-xl bg-white px-4 py-3 text-sm text-zinc-700">
              <p className="font-medium text-zinc-950">{result.state.ruler.name}</p>
              <p>{result.state.ruler.trait}</p>
              <p className="mt-2 text-zinc-500">
                Legitimacy {result.state.ruler.legitimacy} · Age {result.state.ruler.age}
              </p>
            </div>
          </div>
          <div className="space-y-2">
            <h2 className="text-lg font-semibold text-zinc-950">Narrative</h2>
            <p className="leading-7 text-zinc-700">{result.narrative}</p>
          </div>
          <div className="space-y-2">
            <h2 className="text-lg font-semibold text-zinc-950">Deltas</h2>
            {result.deltas.length ? (
              <ul className="space-y-2 text-sm text-zinc-700">
                {result.deltas.map((delta, index) => (
                  <li key={`${delta.key}-${index}`} className="rounded-xl bg-white px-4 py-3">
                    <span className="font-medium text-zinc-950">{delta.key}</span>:{" "}
                    {delta.amount > 0 ? "+" : ""}
                    {delta.amount} <span className="text-zinc-500">({delta.reason})</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-zinc-500">No state changes returned.</p>
            )}
          </div>
          <div className="space-y-2">
            <h2 className="text-lg font-semibold text-zinc-950">Events</h2>
            {result.events.length ? (
              <ul className="space-y-2 text-sm text-zinc-700">
                {result.events.map((event, index) => (
                  <li key={`${event.headline}-${index}`} className="rounded-xl bg-white px-4 py-3">
                    <p className="font-medium text-zinc-950">{event.headline}</p>
                    <p>{event.detail}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-zinc-500">No notable events this turn.</p>
            )}
          </div>
          <div className="space-y-2">
            <h2 className="text-lg font-semibold text-zinc-950">State</h2>
            <div className="grid gap-3 text-sm text-zinc-700 sm:grid-cols-2 lg:grid-cols-3">
              <div className="rounded-xl bg-white px-4 py-3">
                <p className="font-medium text-zinc-950">Treasury</p>
                <p>{result.state.treasury}</p>
              </div>
              <div className="rounded-xl bg-white px-4 py-3">
                <p className="font-medium text-zinc-950">Military</p>
                <p>{result.state.military}</p>
              </div>
              <div className="rounded-xl bg-white px-4 py-3">
                <p className="font-medium text-zinc-950">Stability</p>
                <p>{result.state.stability}</p>
              </div>
              <div className="rounded-xl bg-white px-4 py-3">
                <p className="font-medium text-zinc-950">Influence</p>
                <p>{result.state.influence}</p>
              </div>
              <div className="rounded-xl bg-white px-4 py-3">
                <p className="font-medium text-zinc-950">Tension</p>
                <p>{result.state.tension}</p>
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <h2 className="text-lg font-semibold text-zinc-950">Pending Consequences</h2>
            {result.state.pendingConsequences.length ? (
              <ul className="space-y-2 text-sm text-zinc-700">
                {result.state.pendingConsequences.map((item) => (
                  <li key={item.id} className="rounded-xl bg-white px-4 py-3">
                    <p className="font-medium text-zinc-950">{item.summary}</p>
                    <p className="text-zinc-500">
                      Resolves on turn {item.triggerTurn} · Risk {item.risk}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-zinc-500">No delayed consequences are pending.</p>
            )}
          </div>
          <div className="space-y-2">
            <h2 className="text-lg font-semibold text-zinc-950">Cliffhanger</h2>
            <p className="rounded-xl bg-white px-4 py-3 text-sm leading-7 text-zinc-700">
              {result.cliffhanger ?? result.state.recentCliffhanger ?? "No cliffhanger yet."}
            </p>
          </div>
          {result.ending ? (
            <div className="space-y-2">
              <h2 className="text-lg font-semibold text-zinc-950">Ending Verdict</h2>
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm text-emerald-900">
                <p className="font-medium">{result.ending.verdict}</p>
                <p className="mt-2">{result.ending.summary}</p>
                <p className="mt-2 text-emerald-700">
                  Score {result.ending.score} · Objective{" "}
                  {result.ending.achievedObjective ? "achieved" : "missed"}
                </p>
              </div>
            </div>
          ) : null}
        </section>
      ) : null}
    </main>
  );
}

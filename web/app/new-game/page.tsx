"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { getScenarios, type Scenario } from "@/lib/game";

const DIFFICULTY_LABEL: Record<Scenario["difficulty"], string> = {
  easy: "●○○  Easy",
  medium: "●●○  Medium",
  hard: "●●●  Hard",
};

type CreateGameResponse = {
  gameId?: string;
  error?: string;
};

export default function NewGamePage() {
  const router = useRouter();
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const scenarios = getScenarios();

  async function startGame(scenarioId: string) {
    setLoadingId(scenarioId);
    setError(null);

    try {
      const response = await fetch("/api/games", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenarioId }),
      });

      const data = (await response.json()) as CreateGameResponse;

      if (!response.ok || !data.gameId) {
        throw new Error(data.error ?? "Failed to create game");
      }

      router.push(`/turn?gameId=${data.gameId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoadingId(null);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-10 px-6 py-16">
      <header className="space-y-3">
        <p className="text-sm font-medium uppercase tracking-[0.25em] text-zinc-500">Histra</p>
        <h1 className="text-4xl font-semibold tracking-tight text-zinc-950">
          Choose your crisis
        </h1>
        <p className="max-w-2xl text-base leading-7 text-zinc-600">
          Six historical inflection points. Each one was decided by the choices made in the
          opening weeks.
        </p>
      </header>

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {scenarios.map((scenario) => (
          <div
            key={scenario.id}
            className="flex flex-col gap-5 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm"
          >
            <div className="space-y-1">
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-zinc-400">
                {scenario.countryName} · {scenario.year}
              </p>
              <h2 className="text-xl font-semibold leading-tight text-zinc-950">
                {scenario.crisisName}
              </h2>
              <p className="text-sm text-zinc-500">{scenario.era}</p>
            </div>

            <p className="flex-1 text-sm leading-6 text-zinc-600">{scenario.description}</p>

            <div className="space-y-1.5 border-t border-zinc-100 pt-4 text-sm">
              <p className="text-zinc-700">
                <span className="font-medium">{scenario.historicalRuler.name}</span>
                {" · "}
                <span className="text-zinc-500">{scenario.historicalRuler.trait}</span>
              </p>
              <p className="font-mono text-xs text-zinc-400">
                {DIFFICULTY_LABEL[scenario.difficulty]}
              </p>
            </div>

            <button
              type="button"
              disabled={loadingId !== null}
              onClick={() => startGame(scenario.id)}
              className="w-full rounded-full bg-zinc-950 px-4 py-3 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-400"
            >
              {loadingId === scenario.id
                ? "Starting…"
                : `Play as ${scenario.historicalRuler.name}`}
            </button>
          </div>
        ))}
      </div>
    </main>
  );
}

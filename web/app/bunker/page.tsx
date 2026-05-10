"use client";

import { type FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function BunkerLandingPage() {
  const router = useRouter();
  const [joinCode, setJoinCode] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate() {
    setCreating(true);
    setError(null);

    try {
      const res = await fetch("/api/bunker", { method: "POST" });
      const data = (await res.json()) as { gameId?: string; hostId?: string; error?: string };

      if (!res.ok || !data.gameId || !data.hostId) {
        setError(data.error ?? "Failed to create game.");
        return;
      }

      localStorage.setItem(`bunker_host_${data.gameId}`, data.hostId);
      localStorage.setItem(`bunker_player_${data.gameId}`, data.hostId);
      router.push(`/bunker/${data.gameId}`);
    } catch {
      setError("Network error. Try again.");
    } finally {
      setCreating(false);
    }
  }

  function handleJoin(e: FormEvent) {
    e.preventDefault();
    const code = joinCode.trim();
    if (code) router.push(`/bunker/${code}`);
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Hero */}
      <div className="relative flex min-h-screen flex-col items-center justify-center px-6 text-center">
        {/* Ambient glow */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute left-1/2 top-1/2 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-red-900/20 blur-[120px]" />
        </div>

        <div className="relative z-10 max-w-3xl space-y-10">
          {/* Badge */}
          <p className="inline-block rounded-full border border-red-800/60 bg-red-950/40 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.3em] text-red-400">
            Survival · Social Deduction · Party Game
          </p>

          {/* Title */}
          <div className="space-y-4">
            <h1 className="text-6xl font-black tracking-tighter text-zinc-50 sm:text-7xl">
              Bunker
              <span className="text-red-500">.</span>
            </h1>
            <p className="text-xl font-medium text-zinc-400">
              A catastrophe has ended the world as you know it.
              <br />A bunker was found — but it can only hold{" "}
              <span className="text-zinc-200">half of you</span>.
            </p>
          </div>

          {/* Pitch */}
          <p className="mx-auto max-w-xl text-base leading-8 text-zinc-500">
            Each player gets a secret character card. Reveal your traits round by round,
            argue your worth, and vote out those who don&apos;t deserve to survive.
            Bluff. Persuade. Defend yourself. The bunker doors close when the votes are cast.
          </p>

          {/* Actions */}
          <div className="flex flex-col items-center gap-6">
            <button
              onClick={handleCreate}
              disabled={creating}
              className="inline-flex items-center gap-2 rounded-full bg-red-600 px-8 py-4 text-base font-semibold text-white shadow-lg shadow-red-900/40 transition hover:bg-red-500 active:scale-95 disabled:opacity-60"
            >
              {creating ? (
                <>
                  <Spinner />
                  Setting up bunker…
                </>
              ) : (
                "Create Game"
              )}
            </button>

            <div className="flex items-center gap-4 text-zinc-600">
              <span className="h-px w-16 bg-zinc-800" />
              <span className="text-sm">or join an existing game</span>
              <span className="h-px w-16 bg-zinc-800" />
            </div>

            <form onSubmit={handleJoin} className="flex gap-3">
              <input
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value)}
                placeholder="Paste game ID…"
                className="w-72 rounded-full border border-zinc-700 bg-zinc-900 px-5 py-3 text-sm text-zinc-100 placeholder-zinc-600 outline-none transition focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500"
              />
              <button
                type="submit"
                disabled={!joinCode.trim()}
                className="rounded-full border border-zinc-700 bg-zinc-800 px-6 py-3 text-sm font-medium text-zinc-200 transition hover:border-zinc-500 hover:bg-zinc-700 disabled:opacity-50"
              >
                Join
              </button>
            </form>

            {error && <p className="text-sm text-red-400">{error}</p>}
          </div>
        </div>

        {/* Rules summary strip */}
        <div className="relative z-10 mt-24 grid w-full max-w-4xl grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { n: "6–15", label: "Players" },
            { n: "7", label: "Max Rounds" },
            { n: "11", label: "Character Traits" },
            { n: "50%", label: "Survive" },
          ].map(({ n, label }) => (
            <div
              key={label}
              className="rounded-2xl border border-zinc-800/80 bg-zinc-900/60 px-4 py-5 text-center backdrop-blur"
            >
              <p className="text-3xl font-black text-zinc-100">{n}</p>
              <p className="mt-1 text-xs font-medium uppercase tracking-widest text-zinc-500">
                {label}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* How it works */}
      <section className="mx-auto max-w-4xl space-y-12 px-6 pb-24">
        <h2 className="text-center text-2xl font-bold tracking-tight text-zinc-200">
          How It Works
        </h2>

        <div className="grid gap-6 sm:grid-cols-3">
          {[
            {
              step: "01",
              title: "Get Your Character",
              body: "Each player receives a secret card with 11 unique traits — profession, health, phobias, special abilities, and more. The AI generates a fresh catastrophe and bunker for every game.",
            },
            {
              step: "02",
              title: "Reveal & Argue",
              body: "Each round you reveal more of your character to the group. Make your case for why you deserve a spot. Attack others. Defend yourself. Information is power.",
            },
            {
              step: "03",
              title: "Vote Someone Out",
              body: "At the end of each round the group votes. 70% support eliminates immediately — otherwise there are defenses, re-votes, and last words. Half the group makes it in.",
            },
          ].map(({ step, title, body }) => (
            <div
              key={step}
              className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6 space-y-3"
            >
              <p className="text-xs font-bold uppercase tracking-[0.3em] text-red-600">{step}</p>
              <h3 className="text-base font-semibold text-zinc-100">{title}</h3>
              <p className="text-sm leading-7 text-zinc-500">{body}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function Spinner() {
  return (
    <svg
      className="h-4 w-4 animate-spin"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8v8H4z"
      />
    </svg>
  );
}

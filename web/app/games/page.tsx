import Link from "next/link";

import { normalizeState } from "@/lib/game";
import { supabaseAdmin } from "@/lib/supabase/server";

type GameRow = {
  id: string;
  title: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  game_states:
    | {
        turn_number: number;
        state: unknown;
      }
    | {
        turn_number: number;
        state: unknown;
      }[]
    | null;
};

export default async function GamesPage() {
  const { data, error } = await supabaseAdmin
    .from("games")
    .select("id, title, status, created_at, updated_at, game_states(turn_number, state)")
    .order("updated_at", { ascending: false })
    .limit(20);

  if (error) {
    throw new Error(error.message);
  }

  const games = (data ?? []) as GameRow[];

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-8 px-6 py-12">
      <header className="space-y-3">
        <p className="text-sm font-medium uppercase tracking-[0.25em] text-zinc-500">
          Histra Saves
        </p>
        <h1 className="text-4xl font-semibold tracking-tight text-zinc-950">
          Resume or inspect previous games
        </h1>
        <p className="max-w-2xl text-base leading-7 text-zinc-600">
          This is the simplest saved-games view for Stage 1. Pick a game to read its
          recap, inspect the current state, or continue the turn loop.
        </p>
      </header>

      <div className="grid gap-4">
        {games.length ? (
          games.map((game) => {
            const stateRow = Array.isArray(game.game_states)
              ? game.game_states[0]
              : game.game_states;
            const state = normalizeState(stateRow?.state);
            const turnNumber = stateRow?.turn_number ?? 0;

            return (
              <Link
                key={game.id}
                href={`/games/${game.id}`}
                className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm transition hover:border-zinc-950"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="space-y-1">
                    <h2 className="text-lg font-semibold text-zinc-950">
                      {game.title || "Untitled game"}
                    </h2>
                    <p className="text-sm text-zinc-600">{game.id}</p>
                  </div>
                  <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium uppercase tracking-[0.15em] text-zinc-700">
                    {game.status}
                  </span>
                </div>
                <div className="mt-4 grid gap-3 text-sm text-zinc-600 sm:grid-cols-3">
                  <p>Turn {turnNumber}</p>
                  <p>Stability {state.stability}</p>
                  <p>Tension {state.tension}</p>
                </div>
                <p className="mt-4 text-sm text-zinc-600">
                  {state.objective.title} · Ruler {state.ruler.name}
                </p>
              </Link>
            );
          })
        ) : (
          <section className="rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 p-8 text-zinc-600">
            No saved games yet. Run the first turn in the tester to create one.
          </section>
        )}
      </div>
    </main>
  );
}

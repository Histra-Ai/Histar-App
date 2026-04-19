import Link from "next/link";
import { notFound } from "next/navigation";

import { buildRecap, normalizeState, type RecentTurn } from "@/lib/game";
import { supabaseAdmin } from "@/lib/supabase/server";

type ChroniclePageProps = {
  params: Promise<{
    gameId: string;
  }>;
};

type TurnRow = {
  turn_number: number;
  player_input: string;
  narrative: string | null;
};

export default async function ChroniclePage({ params }: ChroniclePageProps) {
  const { gameId } = await params;

  const [{ data: game, error: gameError }, { data: turns, error: turnsError }, { data: stateRow, error: stateError }] =
    await Promise.all([
      supabaseAdmin
        .from("games")
        .select("id, title, status, created_at, updated_at")
        .eq("id", gameId)
        .maybeSingle(),
      supabaseAdmin
        .from("turns")
        .select("turn_number, player_input, narrative")
        .eq("game_id", gameId)
        .order("turn_number", { ascending: true }),
      supabaseAdmin
        .from("game_states")
        .select("state")
        .eq("game_id", gameId)
        .maybeSingle(),
    ]);

  if (gameError || turnsError || stateError) {
    throw new Error(
      gameError?.message ??
        turnsError?.message ??
        stateError?.message ??
        "Failed to load chronicle",
    );
  }

  if (!game) {
    notFound();
  }

  const typedTurns = (turns ?? []) as TurnRow[];
  const state = normalizeState(stateRow?.state);
  const recap = buildRecap(typedTurns.slice(-5) as RecentTurn[], state);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col gap-8 px-6 py-12">
      <header className="space-y-4">
        <Link
          href={`/games/${game.id}`}
          className="text-sm font-medium text-zinc-500 transition hover:text-zinc-900"
        >
          Back to game detail
        </Link>
        <p className="text-sm font-medium uppercase tracking-[0.25em] text-zinc-500">
          Chronicle
        </p>
        <h1 className="text-5xl font-semibold tracking-tight text-zinc-950">
          {game.title || "Untitled game"}
        </h1>
        <p className="max-w-3xl text-lg leading-8 text-zinc-700">{recap}</p>
      </header>

      <section className="rounded-3xl border border-zinc-200 bg-zinc-50 p-8">
        <p className="text-sm font-medium uppercase tracking-[0.15em] text-zinc-500">Objective</p>
        <h2 className="mt-3 text-2xl font-semibold text-zinc-950">{state.objective.title}</h2>
        <p className="mt-2 leading-7 text-zinc-700">{state.objective.description}</p>
        <p className="mt-3 text-sm text-zinc-500">
          Ruler: {state.ruler.name}, {state.ruler.trait}. Tension ended at {state.tension}.
        </p>
        {state.ending ? (
          <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-5 text-emerald-900">
            <p className="text-sm font-medium uppercase tracking-[0.15em] text-emerald-700">
              Final Verdict
            </p>
            <p className="mt-3 text-xl font-semibold">{state.ending.verdict}</p>
            <p className="mt-2 leading-7">{state.ending.summary}</p>
          </div>
        ) : null}
      </section>

      <section className="space-y-4">
        {typedTurns.map((turn) => (
          <article key={turn.turn_number} className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-medium uppercase tracking-[0.15em] text-zinc-500">
              Turn {turn.turn_number}
            </p>
            <p className="mt-3 text-sm font-medium text-zinc-900">{turn.player_input}</p>
            <p className="mt-3 leading-7 text-zinc-700">{turn.narrative ?? "No narrative recorded."}</p>
          </article>
        ))}
      </section>
    </main>
  );
}

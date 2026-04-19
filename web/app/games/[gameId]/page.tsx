import Link from "next/link";
import { notFound } from "next/navigation";

import { buildRecap, normalizeState, type RecentTurn } from "@/lib/game";
import { supabaseAdmin } from "@/lib/supabase/server";

type PageProps = {
  params: Promise<{
    gameId: string;
  }>;
};

type TurnRow = {
  turn_number: number;
  player_input: string;
  narrative: string | null;
};

export default async function GameDetailPage({ params }: PageProps) {
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
        .select("turn_number, state")
        .eq("game_id", gameId)
        .maybeSingle(),
    ]);

  if (gameError || turnsError || stateError) {
    throw new Error(
      gameError?.message ??
        turnsError?.message ??
        stateError?.message ??
        "Failed to load game",
    );
  }

  if (!game) {
    notFound();
  }

  const typedTurns = (turns ?? []) as TurnRow[];
  const state = normalizeState(stateRow?.state);
  const recap = buildRecap(typedTurns.slice(-5) as RecentTurn[], state);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-8 px-6 py-12">
      <header className="space-y-4">
        <Link
          href="/games"
          className="text-sm font-medium text-zinc-500 transition hover:text-zinc-900"
        >
          Back to saved games
        </Link>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium uppercase tracking-[0.25em] text-zinc-500">
              Histra Game
            </p>
            <h1 className="text-4xl font-semibold tracking-tight text-zinc-950">
              {game.title || "Untitled game"}
            </h1>
            <p className="text-sm text-zinc-600">{game.id}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href={`/turn?gameId=${game.id}`}
              className="inline-flex items-center justify-center rounded-full bg-zinc-950 px-5 py-3 text-sm font-medium text-white transition hover:bg-zinc-800"
            >
              Continue Game
            </Link>
            <Link
              href={`/games/${game.id}/chronicle`}
              className="inline-flex items-center justify-center rounded-full border border-zinc-300 px-5 py-3 text-sm font-medium text-zinc-700 transition hover:border-zinc-950 hover:text-zinc-950"
            >
              Open Chronicle
            </Link>
          </div>
        </div>
      </header>

      <section className="rounded-2xl border border-zinc-200 bg-zinc-50 p-6">
        <h2 className="text-lg font-semibold text-zinc-950">Recap</h2>
        <p className="mt-3 leading-7 text-zinc-700">{recap}</p>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium uppercase tracking-[0.15em] text-zinc-500">Objective</p>
          <h2 className="mt-3 text-xl font-semibold text-zinc-950">{state.objective.title}</h2>
          <p className="mt-2 leading-7 text-zinc-700">{state.objective.description}</p>
          <p className="mt-3 text-sm text-zinc-500">
            Target: {state.objective.key} {state.objective.target}
          </p>
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium uppercase tracking-[0.15em] text-zinc-500">Ruler</p>
          <h2 className="mt-3 text-xl font-semibold text-zinc-950">{state.ruler.name}</h2>
          <p className="mt-2 leading-7 text-zinc-700">{state.ruler.trait}</p>
          <p className="mt-3 text-sm text-zinc-500">
            Legitimacy {state.ruler.legitimacy} · Age {state.ruler.age}
          </p>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <MetricCard label="Treasury" value={state.treasury} />
        <MetricCard label="Military" value={state.military} />
        <MetricCard label="Stability" value={state.stability} />
        <MetricCard label="Influence" value={state.influence} />
        <MetricCard label="Tension" value={state.tension} />
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-6">
          <h2 className="text-lg font-semibold text-zinc-950">Pending Consequences</h2>
          {state.pendingConsequences.length ? (
            <ul className="mt-3 space-y-3">
              {state.pendingConsequences.map((item) => (
                <li key={item.id} className="rounded-xl bg-white px-4 py-3 text-sm text-zinc-700">
                  <p className="font-medium text-zinc-950">{item.summary}</p>
                  <p className="text-zinc-500">
                    Resolves on turn {item.triggerTurn} · Risk {item.risk}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-zinc-600">No delayed consequences are in motion.</p>
          )}
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-6">
          <h2 className="text-lg font-semibold text-zinc-950">Cliffhanger</h2>
          <p className="mt-3 leading-7 text-zinc-700">
            {state.recentCliffhanger ?? "No cliffhanger recorded yet."}
          </p>
          {state.ending ? (
            <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm text-emerald-900">
              <p className="font-medium">{state.ending.verdict}</p>
              <p className="mt-2">{state.ending.summary}</p>
              <p className="mt-2 text-emerald-700">
                Score {state.ending.score} · Objective{" "}
                {state.ending.achievedObjective ? "achieved" : "missed"}
              </p>
            </div>
          ) : null}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-zinc-950">Turn History</h2>
        <div className="space-y-3">
          {typedTurns.length ? (
            typedTurns.map((turn) => (
              <article
                key={turn.turn_number}
                className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm"
              >
                <p className="text-sm font-medium uppercase tracking-[0.2em] text-zinc-500">
                  Turn {turn.turn_number}
                </p>
                <p className="mt-3 text-sm font-medium text-zinc-900">{turn.player_input}</p>
                <p className="mt-2 leading-7 text-zinc-700">
                  {turn.narrative ?? "No narrative recorded."}
                </p>
              </article>
            ))
          ) : (
            <div className="rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 p-6 text-zinc-600">
              No turns recorded yet.
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

function MetricCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-medium uppercase tracking-[0.15em] text-zinc-500">{label}</p>
      <p className="mt-3 text-3xl font-semibold tracking-tight text-zinc-950">{value}</p>
    </div>
  );
}

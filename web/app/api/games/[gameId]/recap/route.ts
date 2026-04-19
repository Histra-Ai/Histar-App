import { NextResponse } from "next/server";

import { buildRecap, normalizeState, type RecentTurn } from "@/lib/game";
import { supabaseAdmin } from "@/lib/supabase/server";

type RouteContext = {
  params: Promise<{
    gameId: string;
  }>;
};

export async function GET(_: Request, context: RouteContext) {
  const { gameId } = await context.params;

  const [{ data: game, error: gameError }, { data: turns, error: turnsError }, { data: stateRow, error: stateError }] =
    await Promise.all([
      supabaseAdmin
        .from("games")
        .select("id, status, created_at, updated_at")
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
    return NextResponse.json(
      {
        error:
          gameError?.message ??
          turnsError?.message ??
          stateError?.message ??
          "Failed to load recap",
      },
      { status: 500 },
    );
  }

  if (!game) {
    return NextResponse.json({ error: "Game not found" }, { status: 404 });
  }

  const recentTurns = ((turns ?? []).slice(-5) as RecentTurn[]) ?? [];
  const state = normalizeState(stateRow?.state);

  return NextResponse.json({
    game,
    recap: buildRecap(recentTurns, state),
    turns: turns ?? [],
    state,
  });
}

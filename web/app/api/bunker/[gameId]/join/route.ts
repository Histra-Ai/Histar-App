import { NextResponse } from "next/server";

import { normalizeBunkerState, type Character } from "@/lib/bunker";
import { supabaseAdmin } from "@/lib/supabase/server";

type Params = { params: Promise<{ gameId: string }> };

export async function POST(req: Request, { params }: Params) {
  try {
    const { gameId } = await params;
    const { name } = (await req.json()) as { name?: string };

    if (!name?.trim()) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const { data: stateRow, error: stateError } = await supabaseAdmin
      .from("game_states")
      .select("state")
      .eq("game_id", gameId)
      .maybeSingle();

    if (stateError || !stateRow) {
      return NextResponse.json({ error: "Game not found" }, { status: 404 });
    }

    const state = normalizeBunkerState(stateRow.state);
    if (!state) {
      return NextResponse.json({ error: "Invalid game type" }, { status: 400 });
    }

    if (state.phase !== "lobby") {
      return NextResponse.json({ error: "Game has already started" }, { status: 400 });
    }

    if (state.players.length >= 15) {
      return NextResponse.json({ error: "Game is full (max 15 players)" }, { status: 400 });
    }

    const playerId = crypto.randomUUID();

    state.players.push({
      id: playerId,
      name: name.trim(),
      seatNumber: state.players.length + 1,
      character: {} as Character,
      revealedKeys: [],
      isEliminated: false,
      hasUsedDefense: false,
      notes: "",
    });

    const { error: updateError } = await supabaseAdmin
      .from("game_states")
      .upsert({ game_id: gameId, turn_number: 0, state });

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ playerId, seatNumber: state.players.length });
  } catch {
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";

import { createInitialState } from "@/lib/bunker";
import { supabaseAdmin } from "@/lib/supabase/server";

export async function POST() {
  try {
    const { data: game, error: gameError } = await supabaseAdmin
      .from("games")
      .insert({ title: "Bunker Game" })
      .select("id")
      .single();

    if (gameError || !game) {
      return NextResponse.json({ error: "Failed to create game" }, { status: 500 });
    }

    const hostId = crypto.randomUUID();
    const state = createInitialState(hostId);

    const { error: stateError } = await supabaseAdmin
      .from("game_states")
      .upsert({ game_id: game.id, turn_number: 0, state });

    if (stateError) {
      return NextResponse.json({ error: stateError.message }, { status: 500 });
    }

    return NextResponse.json({ gameId: game.id, hostId });
  } catch {
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
  }
}

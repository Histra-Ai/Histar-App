import { NextResponse } from "next/server";

import { getInitialState, getScenarioById } from "@/lib/game";
import { supabaseAdmin } from "@/lib/supabase/server";

type CreateGameRequest = {
  scenarioId?: string;
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as CreateGameRequest;
    const scenario = body.scenarioId ? getScenarioById(body.scenarioId) : undefined;
    const title = scenario
      ? `${scenario.countryName} — ${scenario.crisisName}`
      : "Untitled game";

    const { data: game, error: gameError } = await supabaseAdmin
      .from("games")
      .insert({ title })
      .select("id")
      .single();

    if (gameError || !game?.id) {
      return NextResponse.json(
        { error: gameError?.message ?? "Failed to create game" },
        { status: 500 },
      );
    }

    const gameId = game.id as string;
    const initialState = getInitialState(gameId, scenario);

    const { error: stateError } = await supabaseAdmin.from("game_states").upsert({
      game_id: gameId,
      turn_number: 0,
      state: initialState,
    });

    if (stateError) {
      return NextResponse.json({ error: stateError.message }, { status: 500 });
    }

    return NextResponse.json({ gameId });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unexpected server error" },
      { status: 500 },
    );
  }
}

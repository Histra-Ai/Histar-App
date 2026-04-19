import { NextResponse } from "next/server";
import OpenAI from "openai";

import { supabaseAdmin } from "@/lib/supabase/server";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

type TurnRequest = {
  gameId?: string;
  playerInput?: string;
};

function buildPrompt(playerInput: string) {
  return [
    "You are simulating one turn of an alternate-history strategy game.",
    "Respond with one concise narrative paragraph.",
    "Focus on consequences, tension, and political change.",
    `Player action: ${playerInput}`,
  ].join("\n");
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as TurnRequest;
    const playerInput = body.playerInput?.trim();

    if (!playerInput) {
      return NextResponse.json(
        { error: "playerInput is required" },
        { status: 400 },
      );
    }

    let gameId = body.gameId;

    if (!gameId) {
      const { data: game, error: gameError } = await supabaseAdmin
        .from("games")
        .insert({ title: "Local test game" })
        .select("id")
        .single();

      if (gameError || !game) {
        return NextResponse.json(
          { error: gameError?.message ?? "Failed to create game" },
          { status: 500 },
        );
      }

      gameId = game.id;

      const { error: stateError } = await supabaseAdmin.from("game_states").upsert({
        game_id: gameId,
        turn_number: 0,
        state: {},
      });

      if (stateError) {
        return NextResponse.json({ error: stateError.message }, { status: 500 });
      }
    }

    const { data: currentState, error: stateReadError } = await supabaseAdmin
      .from("game_states")
      .select("turn_number")
      .eq("game_id", gameId)
      .maybeSingle();

    if (stateReadError) {
      return NextResponse.json(
        { error: stateReadError.message },
        { status: 500 },
      );
    }

    const nextTurnNumber = (currentState?.turn_number ?? 0) + 1;

    const completion = await openai.responses.create({
      model: process.env.OPENAI_MODEL ?? "gpt-4.1-mini",
      input: buildPrompt(playerInput),
    });

    const narrative = completion.output_text?.trim() || "No narrative returned.";

    const { error: turnError } = await supabaseAdmin.from("turns").insert({
      game_id: gameId,
      turn_number: nextTurnNumber,
      player_input: playerInput,
      narrative,
      raw_response: completion,
    });

    if (turnError) {
      return NextResponse.json({ error: turnError.message }, { status: 500 });
    }

    const { error: stateWriteError } = await supabaseAdmin.from("game_states").upsert({
      game_id: gameId,
      turn_number: nextTurnNumber,
      state: {
        lastPlayerInput: playerInput,
        lastNarrative: narrative,
      },
    });

    if (stateWriteError) {
      return NextResponse.json(
        { error: stateWriteError.message },
        { status: 500 },
      );
    }

    return NextResponse.json({
      gameId,
      turnNumber: nextTurnNumber,
      narrative,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Unexpected server error",
      },
      { status: 500 },
    );
  }
}

import { NextResponse } from "next/server";
import OpenAI from "openai";

import {
  MAX_TURNS,
  applyDeltas,
  buildPrompt,
  buildCliffhanger,
  computeEnding,
  createPendingConsequences,
  getInitialState,
  normalizeState,
  parseTurnPayload,
  resolveServerTurnEffects,
  type RecentTurn,
} from "@/lib/game";
import { supabaseAdmin } from "@/lib/supabase/server";

type TurnRequest = {
  gameId?: string;
  playerInput?: string;
};

function createModelClient() {
  const openRouterKey = process.env.OPENROUTER_API_KEY;

  if (openRouterKey) {
    return new OpenAI({
      apiKey: openRouterKey,
      baseURL: "https://openrouter.ai/api/v1",
    });
  }

  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
}

function getModelName() {
  if (process.env.OPENROUTER_API_KEY) {
    return process.env.OPENROUTER_MODEL ?? "openai/gpt-4.1-mini";
  }

  return process.env.OPENAI_MODEL ?? "gpt-4.1-mini";
}

export async function POST(req: Request) {
  try {
    const client = createModelClient();
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

      if (gameError || !game?.id) {
        return NextResponse.json(
          { error: gameError?.message ?? "Failed to create game" },
          { status: 500 },
        );
      }

      const createdGameId = game.id;
      gameId = createdGameId;

      const { error: stateError } = await supabaseAdmin.from("game_states").upsert({
        game_id: createdGameId,
        turn_number: 0,
        state: getInitialState(createdGameId),
      });

      if (stateError) {
        return NextResponse.json({ error: stateError.message }, { status: 500 });
      }
    }

    const { data: currentState, error: stateReadError } = await supabaseAdmin
      .from("game_states")
      .select("turn_number, state")
      .eq("game_id", gameId)
      .maybeSingle();

    if (stateReadError) {
      return NextResponse.json(
        { error: stateReadError.message },
        { status: 500 },
      );
    }

    const nextTurnNumber = (currentState?.turn_number ?? 0) + 1;
    const state = normalizeState(currentState?.state);

    if (nextTurnNumber > MAX_TURNS) {
      const { error: gameUpdateError } = await supabaseAdmin
        .from("games")
        .update({ status: "completed" })
        .eq("id", gameId);

      if (gameUpdateError) {
        return NextResponse.json(
          { error: gameUpdateError.message },
          { status: 500 },
        );
      }

      return NextResponse.json(
        {
          error: `This game has reached the ${MAX_TURNS}-turn cap.`,
          gameId,
          turnCap: MAX_TURNS,
          gameOver: true,
        },
        { status: 400 },
      );
    }

    const { data: recentTurns, error: recentTurnsError } = await supabaseAdmin
      .from("turns")
      .select("turn_number, player_input, narrative")
      .eq("game_id", gameId)
      .order("turn_number", { ascending: false })
      .limit(3);

    if (recentTurnsError) {
      return NextResponse.json(
        { error: recentTurnsError.message },
        { status: 500 },
      );
    }

    const orderedRecentTurns = [...((recentTurns ?? []) as RecentTurn[])].reverse();
    const serverEffects = resolveServerTurnEffects(state, nextTurnNumber);

    const completion = await client.responses.create({
      model: getModelName(),
      input: buildPrompt(
        playerInput,
        serverEffects.state,
        nextTurnNumber,
        orderedRecentTurns,
        serverEffects.notes,
      ),
    });

    const outputText = completion.output_text?.trim() || "";
    const turnPayload = parseTurnPayload(outputText);
    const combinedEvents = [...serverEffects.events, ...turnPayload.events].slice(0, 5);
    const combinedDeltas = [...serverEffects.deltas, ...turnPayload.deltas];
    const nextState = applyDeltas(
      serverEffects.state,
      combinedDeltas,
      turnPayload.narrative,
      combinedEvents,
    );
    const pendingConsequences = createPendingConsequences(playerInput, nextTurnNumber);
    nextState.pendingConsequences = [
      ...nextState.pendingConsequences,
      ...pendingConsequences,
    ].slice(0, 6);
    const gameOver = nextTurnNumber >= MAX_TURNS;

    nextState.recentCliffhanger = gameOver
      ? "The campaign is over. What remains is the judgment of history."
      : buildCliffhanger(nextState, nextTurnNumber + 1);

    if (gameOver) {
      nextState.ending = computeEnding(nextState);
    }

    const { error: turnError } = await supabaseAdmin.from("turns").insert({
      game_id: gameId,
      turn_number: nextTurnNumber,
      player_input: playerInput,
      narrative: turnPayload.narrative,
      raw_response: {
        provider: process.env.OPENROUTER_API_KEY ? "openrouter" : "openai",
        model: getModelName(),
        promptContext: {
          turnNumber: nextTurnNumber,
          state: serverEffects.state,
          recentTurns: orderedRecentTurns,
          serverNotes: serverEffects.notes,
        },
        serverEffects,
        pendingConsequences,
        turnPayload: {
          ...turnPayload,
          deltas: combinedDeltas,
          events: combinedEvents,
        },
        completion,
      },
    });

    if (turnError) {
      return NextResponse.json({ error: turnError.message }, { status: 500 });
    }

    const { error: stateWriteError } = await supabaseAdmin.from("game_states").upsert({
      game_id: gameId,
      turn_number: nextTurnNumber,
      state: nextState,
    });

    if (stateWriteError) {
      return NextResponse.json(
        { error: stateWriteError.message },
        { status: 500 },
      );
    }

    const { error: gameUpdateError } = await supabaseAdmin
      .from("games")
      .update({
        status: gameOver ? "completed" : "active",
        updated_at: new Date().toISOString(),
      })
      .eq("id", gameId);

    if (gameUpdateError) {
      return NextResponse.json(
        { error: gameUpdateError.message },
        { status: 500 },
      );
    }

    return NextResponse.json({
      gameId,
      turnNumber: nextTurnNumber,
      turnCap: MAX_TURNS,
      gameOver,
      narrative: turnPayload.narrative,
      deltas: combinedDeltas,
      events: combinedEvents,
      state: nextState,
      ending: nextState.ending,
      cliffhanger: nextState.recentCliffhanger,
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

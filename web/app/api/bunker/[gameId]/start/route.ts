import { NextResponse } from "next/server";
import OpenAI from "openai";

import {
  normalizeBunkerState,
  buildSetupPrompt,
  parseSetupPayload,
  type Character,
} from "@/lib/bunker";
import { supabaseAdmin } from "@/lib/supabase/server";

type Params = { params: Promise<{ gameId: string }> };

function createModelClient() {
  if (process.env.OPENROUTER_API_KEY) {
    return new OpenAI({
      apiKey: process.env.OPENROUTER_API_KEY,
      baseURL: "https://openrouter.ai/api/v1",
    });
  }

  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

function getModelName() {
  if (process.env.OPENROUTER_API_KEY) {
    return process.env.OPENROUTER_MODEL ?? "openai/gpt-4.1-mini";
  }

  return process.env.OPENAI_MODEL ?? "gpt-4.1-mini";
}

export async function POST(req: Request, { params }: Params) {
  try {
    const { gameId } = await params;
    const { hostId } = (await req.json()) as { hostId?: string };

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

    if (state.hostId !== hostId) {
      return NextResponse.json({ error: "Only the host can start the game" }, { status: 403 });
    }

    if (state.phase !== "lobby") {
      return NextResponse.json({ error: "Game has already started" }, { status: 400 });
    }

    if (state.players.length < 6) {
      return NextResponse.json(
        { error: "Need at least 6 players to start" },
        { status: 400 },
      );
    }

    // Mark as generating so UI can show a loading state
    state.generating = true;
    await supabaseAdmin
      .from("game_states")
      .upsert({ game_id: gameId, turn_number: 0, state });

    // Generate scenario + characters via AI
    const client = createModelClient();
    const completion = await client.responses.create({
      model: getModelName(),
      input: buildSetupPrompt(state.players.length),
    });

    const { catastrophe, bunker, characters } = parseSetupPayload(
      completion.output_text ?? "",
      state.players.length,
    );

    // Shuffle characters so assignment isn't predictable by join order
    const shuffled = [...characters].sort(() => Math.random() - 0.5);

    state.players = state.players.map((player, i) => ({
      ...player,
      character: shuffled[i] as Character,
    }));

    state.catastrophe = catastrophe;
    state.bunker = bunker;
    state.initialPlayerCount = state.players.length;
    state.phase = "introduction";
    state.currentRound = 1;
    state.currentSpeakerIndex = 0;
    state.generating = false;

    await supabaseAdmin
      .from("game_states")
      .upsert({ game_id: gameId, turn_number: 0, state });

    await supabaseAdmin
      .from("games")
      .update({ status: "active" })
      .eq("id", gameId);

    return NextResponse.json({ ok: true });
  } catch (error) {
    // Best-effort: clear generating flag so the UI doesn't get stuck
    try {
      const { gameId: gid } = await params;
      const { data: stateRow } = await supabaseAdmin
        .from("game_states")
        .select("state")
        .eq("game_id", gid)
        .maybeSingle();

      if (stateRow) {
        const s = normalizeBunkerState(stateRow.state);
        if (s) {
          s.generating = false;
          await supabaseAdmin
            .from("game_states")
            .upsert({ game_id: gid, turn_number: 0, state: s });
        }
      }
    } catch {
      // ignore secondary errors
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unexpected error" },
      { status: 500 },
    );
  }
}

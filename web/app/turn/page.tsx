import { buildRecap, normalizeState, type RecentTurn } from "@/lib/game";
import { supabaseAdmin } from "@/lib/supabase/server";

import TurnClientPage from "./turn-client";

type TurnPageProps = {
  searchParams: Promise<{
    gameId?: string;
  }>;
};

export default async function TurnPage({ searchParams }: TurnPageProps) {
  const params = await searchParams;
  const gameId = params.gameId?.trim() || "";
  let recap: string | null = null;

  if (gameId) {
    const [{ data: turns }, { data: stateRow }] = await Promise.all([
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

    if (turns && stateRow) {
      const state = normalizeState(stateRow.state);
      recap = buildRecap((turns as RecentTurn[]).slice(-5), state);
    }
  }

  return <TurnClientPage initialGameId={gameId} recap={recap} />;
}

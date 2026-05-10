import { NextResponse } from "next/server";

import {
  normalizeBunkerState,
  getRoundSpeakingOrder,
  getRevealCount,
  computeVoteOutcome,
  shouldSkipVote,
  isGameOver,
  type BunkerGameState,
  type VoteOutcome,
  type RoundVoteRecord,
} from "@/lib/bunker";
import { supabaseAdmin } from "@/lib/supabase/server";

type Params = { params: Promise<{ gameId: string }> };

type ActionBody =
  | { action: "next_speaker"; hostId: string }
  | { action: "end_phase"; hostId: string }
  | { action: "vote_skip"; playerId: string }
  | { action: "cast_vote"; voterId: string; targetId: string | null }
  | { action: "close_votes"; hostId: string }
  | { action: "next_defense"; hostId: string }
  | { action: "add_note"; hostId: string; playerId: string; note: string }
  | { action: "return_player"; hostId: string; playerId: string };

function eliminatePlayer(state: BunkerGameState, playerId: string) {
  const player = state.players.find((p) => p.id === playerId);
  if (player) {
    player.isEliminated = true;
    // Auto-reveal all characteristics on elimination
    player.revealedKeys = [
      "profession",
      "gender",
      "bodyType",
      "humanTrait",
      "health",
      "hobby",
      "phobia",
      "largeEquipment",
      "backpack",
      "additionalInfo",
      "specialAbility",
    ];
  }
}

function advanceAfterFarewell(state: BunkerGameState) {
  if (isGameOver(state)) {
    state.phase = "ended";
    state.winnersInBunker = state.players
      .filter((p) => !p.isEliminated)
      .map((p) => p.id);
    return;
  }

  // Start next round
  state.currentRound += 1;
  state.currentSpeakerIndex = 0;
  state.currentVotes = [];
  state.skipVoterIds = [];
  state.pendingDefenseIds = [];
  state.phase = "introduction";
}

function resolveVoteOutcome(
  state: BunkerGameState,
  outcome: VoteOutcome,
  phase: 1 | 2,
): void {
  const eliminatedIds: string[] = [];
  let nextPhase: BunkerGameState["phase"] = "farewell";

  if (outcome.type === "landslide") {
    eliminatePlayer(state, outcome.eliminatedId);
    eliminatedIds.push(outcome.eliminatedId);
    nextPhase = "farewell";
  } else if (outcome.type === "plurality") {
    if (phase === 1) {
      // Give candidate a defense speech, then re-vote
      const candidate = state.players.find((p) => p.id === outcome.candidateId);
      if (candidate && !candidate.hasUsedDefense) {
        state.pendingDefenseIds = [outcome.candidateId];
        nextPhase = "defense";
      } else {
        eliminatePlayer(state, outcome.candidateId);
        eliminatedIds.push(outcome.candidateId);
        nextPhase = "farewell";
      }
    } else {
      // Phase 2: eliminate the leader
      eliminatePlayer(state, outcome.candidateId);
      eliminatedIds.push(outcome.candidateId);
      nextPhase = "farewell";
    }
  } else if (outcome.type === "tie") {
    if (phase === 1) {
      // Each tied player gets defense (if not used)
      const eligible = outcome.candidateIds.filter((id) => {
        const p = state.players.find((pl) => pl.id === id);
        return p && !p.hasUsedDefense;
      });
      if (eligible.length > 0) {
        state.pendingDefenseIds = eligible;
        nextPhase = "defense";
      } else {
        // All have used defense — eliminate all tied (unless round 1)
        if (state.currentRound === 1) {
          // First round: close vote, go to next round
          state.currentVotes = [];
          state.skipVoterIds = [];
          state.pendingDefenseIds = [];
          state.currentSpeakerIndex = 0;
          state.currentRound += 1;
          state.phase = "introduction";
          return;
        }

        for (const id of outcome.candidateIds) {
          eliminatePlayer(state, id);
          eliminatedIds.push(id);
        }
        nextPhase = "farewell";
      }
    } else {
      // Phase 2 tie: if round 1, close; else eliminate both
      if (state.currentRound === 1) {
        state.currentVotes = [];
        state.skipVoterIds = [];
        state.pendingDefenseIds = [];
        state.currentSpeakerIndex = 0;
        state.currentRound += 1;
        state.phase = "introduction";
        return;
      }

      for (const id of outcome.candidateIds) {
        eliminatePlayer(state, id);
        eliminatedIds.push(id);
      }
      nextPhase = "farewell";
    }
  } else {
    // no_contest — move to next round
    state.currentVotes = [];
    state.skipVoterIds = [];
    state.pendingDefenseIds = [];
    state.currentSpeakerIndex = 0;
    state.currentRound += 1;
    state.phase = "introduction";
    return;
  }

  const record: RoundVoteRecord = {
    round: state.currentRound,
    phase,
    votes: [...state.currentVotes],
    outcome,
    eliminatedIds,
    skipped: false,
  };
  state.voteHistory.push(record);
  state.currentVotes = [];
  state.phase = nextPhase;
}

export async function POST(req: Request, { params }: Params) {
  try {
    const { gameId } = await params;
    const body = (await req.json()) as ActionBody;

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

    const isHost = "hostId" in body && body.hostId === state.hostId;

    switch (body.action) {
      // ── Host: advance current speaker ────────────────────────────────────
      case "next_speaker": {
        if (!isHost) return NextResponse.json({ error: "Host only" }, { status: 403 });

        const speakingOrder = getRoundSpeakingOrder(state.players, state.currentRound);
        const revealCount = getRevealCount(state.initialPlayerCount, state.currentRound);
        const currentSpeaker = speakingOrder[state.currentSpeakerIndex];

        if (currentSpeaker) {
          // Auto-reveal the required characteristics for the current speaker
          const unrevealed = (
            [
              "profession",
              "gender",
              "bodyType",
              "humanTrait",
              "health",
              "hobby",
              "phobia",
              "largeEquipment",
              "backpack",
              "additionalInfo",
              "specialAbility",
            ] as const
          ).filter((k) => !currentSpeaker.revealedKeys.includes(k));

          const toReveal = unrevealed.slice(0, revealCount);
          const playerInState = state.players.find((p) => p.id === currentSpeaker.id);
          if (playerInState) {
            playerInState.revealedKeys = [
              ...new Set([...playerInState.revealedKeys, ...toReveal]),
            ];
          }
        }

        state.currentSpeakerIndex += 1;

        if (state.currentSpeakerIndex >= speakingOrder.length) {
          // All speakers done — move to group discussion (or skip to accusation if R3+)
          state.currentSpeakerIndex = 0;
          state.phase =
            state.phase === "introduction" ? "group_discussion" : "voting";
        }

        break;
      }

      // ── Host: end the current timed phase ────────────────────────────────
      case "end_phase": {
        if (!isHost) return NextResponse.json({ error: "Host only" }, { status: 403 });

        if (state.phase === "group_discussion") {
          state.phase = "accusation";
          state.currentSpeakerIndex = 0;
        } else if (state.phase === "accusation") {
          // Advance accusation speaker or move to voting
          const speakingOrder = getRoundSpeakingOrder(state.players, state.currentRound);
          state.currentSpeakerIndex += 1;
          if (state.currentSpeakerIndex >= speakingOrder.length) {
            state.currentSpeakerIndex = 0;
            state.phase = "voting";
            state.currentVotes = [];
            state.skipVoterIds = [];
          }
        } else if (state.phase === "defense") {
          // Mark the current defender as having used their defense
          if (state.pendingDefenseIds.length > 0) {
            const defenderId = state.pendingDefenseIds[0];
            const player = state.players.find((p) => p.id === defenderId);
            if (player) player.hasUsedDefense = true;
            state.pendingDefenseIds = state.pendingDefenseIds.slice(1);
          }

          if (state.pendingDefenseIds.length > 0) {
            // More defenders waiting
            state.phase = "defense";
          } else {
            // All defenses done — run repeated vote
            state.phase = "repeated_voting";
            state.currentVotes = [];
          }
        } else if (state.phase === "farewell") {
          advanceAfterFarewell(state);
        }

        break;
      }

      // ── Player: vote to skip this round's vote ────────────────────────────
      case "vote_skip": {
        if (state.phase !== "voting") {
          return NextResponse.json({ error: "Not in voting phase" }, { status: 400 });
        }

        if (state.currentRound !== 1) {
          return NextResponse.json(
            { error: "Vote skip is only allowed in round 1" },
            { status: 400 },
          );
        }

        const { playerId } = body;
        if (!state.skipVoterIds.includes(playerId)) {
          state.skipVoterIds.push(playerId);
        }

        const activePlayers = state.players.filter((p) => !p.isEliminated).length;
        if (shouldSkipVote(state.skipVoterIds.length, activePlayers)) {
          const record: RoundVoteRecord = {
            round: state.currentRound,
            phase: 1,
            votes: [],
            outcome: { type: "no_contest" },
            eliminatedIds: [],
            skipped: true,
          };
          state.voteHistory.push(record);
          state.skipVoterIds = [];
          state.currentVotes = [];
          state.currentSpeakerIndex = 0;
          state.currentRound += 1;
          state.phase = "introduction";
        }

        break;
      }

      // ── Player: cast vote ─────────────────────────────────────────────────
      case "cast_vote": {
        const { voterId, targetId } = body;

        if (state.phase !== "voting" && state.phase !== "repeated_voting") {
          return NextResponse.json({ error: "Not in a voting phase" }, { status: 400 });
        }

        // Replace any existing vote from this voter
        state.currentVotes = state.currentVotes.filter((v) => v.voterId !== voterId);
        state.currentVotes.push({ voterId, targetId });

        break;
      }

      // ── Host: close votes and compute result ──────────────────────────────
      case "close_votes": {
        if (!isHost) return NextResponse.json({ error: "Host only" }, { status: 403 });

        const activePlayers = state.players.filter((p) => !p.isEliminated);
        const eligibleIds = activePlayers.map((p) => p.id);

        if (state.phase === "voting") {
          const outcome = computeVoteOutcome(state.currentVotes, eligibleIds);
          resolveVoteOutcome(state, outcome, 1);
        } else if (state.phase === "repeated_voting") {
          // Only the previously defended candidates are eligible
          const lastVoteRecord = [...state.voteHistory]
            .reverse()
            .find((r) => r.phase === 1);
          const candidateIds =
            lastVoteRecord?.outcome.type === "tie"
              ? lastVoteRecord.outcome.candidateIds
              : lastVoteRecord?.outcome.type === "plurality"
                ? [lastVoteRecord.outcome.candidateId]
                : eligibleIds;

          const outcome = computeVoteOutcome(state.currentVotes, candidateIds);
          resolveVoteOutcome(state, outcome, 2);
        }

        break;
      }

      // ── Host: manually advance defense queue ──────────────────────────────
      case "next_defense": {
        if (!isHost) return NextResponse.json({ error: "Host only" }, { status: 403 });
        // Handled by end_phase logic above; kept for explicit calls
        break;
      }

      // ── Host: add note to a player ────────────────────────────────────────
      case "add_note": {
        if (!isHost) return NextResponse.json({ error: "Host only" }, { status: 403 });
        const { playerId: targetPlayerId, note } = body;
        const player = state.players.find((p) => p.id === targetPlayerId);
        if (player) player.notes = note;
        break;
      }

      // ── Host: return eliminated player to camp ────────────────────────────
      case "return_player": {
        if (!isHost) return NextResponse.json({ error: "Host only" }, { status: 403 });
        const { playerId: returnId } = body;
        const player = state.players.find((p) => p.id === returnId);
        if (player) {
          player.isEliminated = false;
          player.revealedKeys = player.revealedKeys.slice(
            0,
            getRevealCount(state.initialPlayerCount, state.currentRound),
          );
        }
        break;
      }

      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }

    // Check game over after any action
    if (state.phase !== "ended" && state.phase !== "farewell" && isGameOver(state)) {
      state.phase = "ended";
      state.winnersInBunker = state.players
        .filter((p) => !p.isEliminated)
        .map((p) => p.id);
    }

    const { error: updateError } = await supabaseAdmin
      .from("game_states")
      .upsert({ game_id: gameId, turn_number: 0, state });

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // Mark game completed when ended
    if (state.phase === "ended") {
      await supabaseAdmin
        .from("games")
        .update({ status: "completed" })
        .eq("id", gameId);
    }

    return NextResponse.json({ ok: true, phase: state.phase });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unexpected error" },
      { status: 500 },
    );
  }
}


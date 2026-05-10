"use client";

import { type FormEvent, useCallback, useEffect, useState } from "react";

import { createBrowserClient } from "@/lib/supabase/client";
import {
  CHARACTER_KEYS,
  CHARACTER_LABELS,
  FOOD_SUPPLY_LABELS,
  PHASE_LABELS,
  getBunkerCapacity,
  getRoundSpeakingOrder,
  getRevealCount,
  normalizeBunkerState,
  type BunkerGameState,
  type CharacterKey,
  type Player,
} from "@/lib/bunker";

// ── Helpers ───────────────────────────────────────────────────────────────────

function post(url: string, body: unknown) {
  return fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function shortId(id: string) {
  return id.slice(0, 8).toUpperCase();
}

// ── Root component ────────────────────────────────────────────────────────────

export function GameClient({ gameId }: { gameId: string }) {
  const [state, setState] = useState<BunkerGameState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [myId, setMyId] = useState<string | null>(null);
  const [isHost, setIsHost] = useState(false);

  // Identity from localStorage
  useEffect(() => {
    const hostId = localStorage.getItem(`bunker_host_${gameId}`);
    const playerId = localStorage.getItem(`bunker_player_${gameId}`);
    if (hostId) {
      setIsHost(true);
      setMyId(hostId);
    } else if (playerId) {
      setMyId(playerId);
    }
  }, [gameId]);

  // Load initial state + subscribe to Realtime
  const loadState = useCallback(async () => {
    const supabase = createBrowserClient();
    const { data, error: err } = await supabase
      .from("game_states")
      .select("state")
      .eq("game_id", gameId)
      .maybeSingle();

    if (err || !data) {
      setError("Game not found.");
      setLoading(false);
      return;
    }

    const parsed = normalizeBunkerState(data.state);
    if (!parsed) {
      setError("This game ID doesn't belong to a Bunker game.");
      setLoading(false);
      return;
    }

    setState(parsed);
    setLoading(false);
  }, [gameId]);

  useEffect(() => {
    loadState();

    const supabase = createBrowserClient();
    const channel = supabase
      .channel(`bunker_${gameId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "game_states",
          filter: `game_id=eq.${gameId}`,
        },
        (payload: { new: { state: unknown } }) => {
          const parsed = normalizeBunkerState(payload.new.state);
          if (parsed) setState(parsed);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [gameId, loadState]);

  if (loading) return <FullScreenLoader />;
  if (error || !state) return <FullScreenError message={error ?? "Unknown error"} />;

  // Visitor has no identity yet — show join screen
  if (!myId) {
    return <JoinScreen gameId={gameId} state={state} onJoined={(id) => setMyId(id)} />;
  }

  if (state.phase === "lobby") {
    return (
      <LobbyScreen
        gameId={gameId}
        state={state}
        myId={myId}
        isHost={isHost}
      />
    );
  }

  if (state.phase === "ended") {
    return <EndedScreen state={state} myId={myId} />;
  }

  return (
    <GameScreen
      gameId={gameId}
      state={state}
      myId={myId}
      isHost={isHost}
    />
  );
}

// ── Join screen ───────────────────────────────────────────────────────────────

function JoinScreen({
  gameId,
  state,
  onJoined,
}: {
  gameId: string;
  state: BunkerGameState;
  onJoined: (playerId: string) => void;
}) {
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleJoin(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    setError(null);

    const res = await post(`/api/bunker/${gameId}/join`, { name });
    const data = (await res.json()) as { playerId?: string; error?: string };

    if (!res.ok || !data.playerId) {
      setError(data.error ?? "Failed to join.");
      setBusy(false);
      return;
    }

    localStorage.setItem(`bunker_player_${gameId}`, data.playerId);
    onJoined(data.playerId);
  }

  return (
    <Shell>
      <div className="flex min-h-screen flex-col items-center justify-center px-6">
        <div className="w-full max-w-sm space-y-8">
          <div className="space-y-2 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-red-500">
              Bunker Online
            </p>
            <h1 className="text-3xl font-black tracking-tight text-zinc-100">
              Join the Survivors
            </h1>
            <p className="text-sm text-zinc-500">
              {state.players.length} player{state.players.length !== 1 ? "s" : ""} already at
              the camp
            </p>
          </div>

          <form onSubmit={handleJoin} className="space-y-4">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              maxLength={32}
              autoFocus
              className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-zinc-100 placeholder-zinc-600 outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600"
            />
            {error && <p className="text-xs text-red-400">{error}</p>}
            <button
              type="submit"
              disabled={busy || !name.trim()}
              className="w-full rounded-xl bg-red-600 py-3 text-sm font-semibold text-white transition hover:bg-red-500 disabled:opacity-60"
            >
              {busy ? "Joining…" : "Enter the Camp"}
            </button>
          </form>
        </div>
      </div>
    </Shell>
  );
}

// ── Lobby screen ──────────────────────────────────────────────────────────────

function LobbyScreen({
  gameId,
  state,
  myId,
  isHost,
}: {
  gameId: string;
  state: BunkerGameState;
  myId: string;
  isHost: boolean;
}) {
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const canStart = state.players.length >= 6;

  async function handleStart() {
    setStarting(true);
    setError(null);

    const res = await post(`/api/bunker/${gameId}/start`, { hostId: myId });
    const data = (await res.json()) as { error?: string };

    if (!res.ok) {
      setError(data.error ?? "Failed to start.");
      setStarting(false);
    }
    // State update comes via Realtime
  }

  return (
    <Shell>
      <div className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center gap-10 px-6 py-16">
        {/* Header */}
        <div className="space-y-3">
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-red-500">
            Waiting Room
          </p>
          <h1 className="text-4xl font-black tracking-tight text-zinc-100">
            Bunker Online
          </h1>
          <p className="text-sm text-zinc-500">
            Share this link with your players — they can join from any device.
          </p>
        </div>

        {/* Game code */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">Game ID</p>
          <p className="mt-2 break-all font-mono text-lg text-zinc-200">{gameId}</p>
          <button
            onClick={() => navigator.clipboard.writeText(`${window.location.href}`)}
            className="mt-3 rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-xs font-medium text-zinc-300 transition hover:bg-zinc-700"
          >
            Copy link
          </button>
        </div>

        {/* Player list */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-zinc-400">
              Survivors at the Camp
            </h2>
            <span className="text-sm text-zinc-600">{state.players.length} / 15</span>
          </div>
          <div className="space-y-2">
            {state.players.map((player) => (
              <div
                key={player.id}
                className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3"
              >
                <SeatBadge seat={player.seatNumber} />
                <span className="text-sm font-medium text-zinc-200">{player.name}</span>
                {player.id === myId && (
                  <span className="ml-auto rounded-full bg-zinc-800 px-2 py-0.5 text-xs text-zinc-400">
                    You
                  </span>
                )}
                {player.id === state.hostId && (
                  <span className="ml-auto rounded-full bg-amber-900/40 px-2 py-0.5 text-xs text-amber-400">
                    Host
                  </span>
                )}
              </div>
            ))}
            {state.players.length === 0 && (
              <p className="rounded-xl border border-dashed border-zinc-800 py-6 text-center text-sm text-zinc-600">
                No one here yet…
              </p>
            )}
          </div>
        </div>

        {/* Host controls */}
        {isHost && (
          <div className="space-y-3">
            {!canStart && (
              <p className="text-xs text-amber-500">
                Need at least 6 players to start ({6 - state.players.length} more needed).
              </p>
            )}
            {error && <p className="text-xs text-red-400">{error}</p>}
            {state.generating ? (
              <div className="flex items-center gap-3 rounded-xl border border-amber-800/40 bg-amber-950/30 px-5 py-4">
                <Spinner className="text-amber-400" />
                <p className="text-sm text-amber-300">
                  AI is generating your catastrophe, bunker, and character cards…
                </p>
              </div>
            ) : (
              <button
                onClick={handleStart}
                disabled={!canStart || starting}
                className="w-full rounded-xl bg-red-600 py-4 text-sm font-semibold text-white shadow-lg shadow-red-900/30 transition hover:bg-red-500 disabled:opacity-50"
              >
                {starting ? "Starting…" : `Start Game — ${state.players.length} Players`}
              </button>
            )}
          </div>
        )}

        {!isHost && (
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 px-5 py-4 text-center text-sm text-zinc-500">
            Waiting for the host to start the game…
          </div>
        )}
      </div>
    </Shell>
  );
}

// ── Active game screen ────────────────────────────────────────────────────────

function GameScreen({
  gameId,
  state,
  myId,
  isHost,
}: {
  gameId: string;
  state: BunkerGameState;
  myId: string;
  isHost: boolean;
}) {
  const myPlayer = state.players.find((p) => p.id === myId) ?? null;
  const speakingOrder = getRoundSpeakingOrder(state.players, state.currentRound);
  const currentSpeaker = speakingOrder[state.currentSpeakerIndex] ?? null;
  const revealCount = getRevealCount(state.initialPlayerCount, state.currentRound);
  const capacity = getBunkerCapacity(state.initialPlayerCount);

  async function action(body: Record<string, unknown>) {
    await post(`/api/bunker/${gameId}/action`, body);
  }

  return (
    <Shell>
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        {/* Top bar */}
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <p className="text-xs font-bold uppercase tracking-[0.3em] text-red-500">
              Round {state.currentRound} — {PHASE_LABELS[state.phase]}
            </p>
            <h1 className="text-2xl font-black tracking-tight text-zinc-100">
              {state.catastrophe?.title ?? "Bunker Online"}
            </h1>
          </div>
          <div className="flex items-center gap-2 text-xs text-zinc-500">
            <span className="rounded-full border border-zinc-700 px-3 py-1">
              {state.players.filter((p) => !p.isEliminated).length} remain
            </span>
            <span className="rounded-full border border-emerald-800 bg-emerald-950/40 px-3 py-1 text-emerald-400">
              {capacity} in bunker
            </span>
          </div>
        </header>

        <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
          {/* Left column: main game area */}
          <div className="space-y-6">
            {/* Scenario info */}
            {state.catastrophe && (
              <ScenarioCard catastrophe={state.catastrophe} bunker={state.bunker} />
            )}

            {/* Phase content */}
            <PhasePanel
              state={state}
              myId={myId}
              myPlayer={myPlayer}
              isHost={isHost}
              currentSpeaker={currentSpeaker}
              speakingOrder={speakingOrder}
              revealCount={revealCount}
              onAction={action}
            />

            {/* My character card */}
            {myPlayer && !myPlayer.isEliminated && (
              <MyCharacterCard player={myPlayer} />
            )}
          </div>

          {/* Right column: player list */}
          <aside className="space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-500">
              Survivors
            </h2>
            <div className="space-y-2">
              {state.players.map((player) => (
                <PlayerCard
                  key={player.id}
                  player={player}
                  isCurrent={currentSpeaker?.id === player.id}
                  isMe={player.id === myId}
                  isHost={isHost}
                  state={state}
                  onNote={(note) =>
                    action({ action: "add_note", hostId: myId, playerId: player.id, note })
                  }
                />
              ))}
            </div>
          </aside>
        </div>
      </div>
    </Shell>
  );
}

// ── Phase-specific panel ──────────────────────────────────────────────────────

function PhasePanel({
  state,
  myId,
  myPlayer,
  isHost,
  currentSpeaker,
  speakingOrder,
  revealCount,
  onAction,
}: {
  state: BunkerGameState;
  myId: string;
  myPlayer: Player | null;
  isHost: boolean;
  currentSpeaker: Player | null;
  speakingOrder: Player[];
  revealCount: number;
  onAction: (body: Record<string, unknown>) => Promise<void>;
}) {
  const [selectedVote, setSelectedVote] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState(false);

  const myVote = state.currentVotes.find((v) => v.voterId === myId);
  const activePlayers = state.players.filter((p) => !p.isEliminated);
  const hasVoted = !!myVote;

  async function doAction(body: Record<string, unknown>) {
    setBusyAction(true);
    await onAction(body);
    setBusyAction(false);
  }

  // ── Introduction & Accusation ─────────────────────────────────────────────
  if (state.phase === "introduction" || state.phase === "accusation") {
    const isIntro = state.phase === "introduction";
    const isMyTurn = currentSpeaker?.id === myId;

    return (
      <Panel>
        <div className="space-y-5">
          {/* Current speaker */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
                {isIntro ? `Speaking — reveal ${revealCount} trait${revealCount !== 1 ? "s" : ""}` : "Accusing / Defending"}
              </p>
              <p className="mt-1 text-xl font-bold text-zinc-100">
                {currentSpeaker?.name ?? "—"}
                {isMyTurn && (
                  <span className="ml-2 text-sm font-normal text-red-400">(that&apos;s you)</span>
                )}
              </p>
            </div>
            <SpeakerProgress
              current={state.currentSpeakerIndex}
              total={speakingOrder.length}
            />
          </div>

          {/* Speaking queue */}
          <div className="flex flex-wrap gap-2">
            {speakingOrder.map((p, i) => (
              <span
                key={p.id}
                className={`rounded-full px-3 py-1 text-xs font-medium ${
                  i < state.currentSpeakerIndex
                    ? "bg-zinc-800 text-zinc-600 line-through"
                    : i === state.currentSpeakerIndex
                      ? "bg-red-700 text-red-100"
                      : "bg-zinc-900 text-zinc-400 border border-zinc-800"
                }`}
              >
                {p.name}
              </span>
            ))}
          </div>

          {/* Host control */}
          {isHost && (
            <button
              disabled={busyAction}
              onClick={() => doAction({ action: isIntro ? "next_speaker" : "end_phase", hostId: myId })}
              className="w-full rounded-xl bg-zinc-800 py-3 text-sm font-semibold text-zinc-200 transition hover:bg-zinc-700 disabled:opacity-50"
            >
              {isIntro
                ? state.currentSpeakerIndex >= speakingOrder.length - 1
                  ? "End Introductions →"
                  : `Next Speaker →`
                : state.currentSpeakerIndex >= speakingOrder.length - 1
                  ? "Go to Voting →"
                  : "Next Speaker →"}
            </button>
          )}

          {!isHost && isMyTurn && (
            <div className="rounded-xl border border-amber-800/40 bg-amber-950/30 px-4 py-3 text-sm text-amber-300">
              {isIntro
                ? `It's your turn! Tell your story and reveal ${revealCount} of your traits.`
                : "It's your turn to accuse or defend. Make your case!"}
            </div>
          )}
        </div>
      </Panel>
    );
  }

  // ── Group discussion ──────────────────────────────────────────────────────
  if (state.phase === "group_discussion") {
    return (
      <Panel>
        <div className="space-y-4">
          <p className="text-xs font-bold uppercase tracking-widest text-zinc-400">
            Group Discussion — 1 Minute
          </p>
          <p className="text-sm leading-7 text-zinc-400">
            Everyone can speak freely. No individual restrictions — just 60 seconds as a group.
          </p>
          {isHost && (
            <button
              disabled={busyAction}
              onClick={() => doAction({ action: "end_phase", hostId: myId })}
              className="w-full rounded-xl bg-zinc-800 py-3 text-sm font-semibold text-zinc-200 transition hover:bg-zinc-700 disabled:opacity-50"
            >
              End Discussion — Go to Accusations →
            </button>
          )}
        </div>
      </Panel>
    );
  }

  // ── Voting / Repeated voting ──────────────────────────────────────────────
  if (state.phase === "voting" || state.phase === "repeated_voting") {
    const isRepeated = state.phase === "repeated_voting";

    return (
      <Panel>
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-widest text-zinc-400">
              {isRepeated ? "Re-Vote" : "Cast Your Vote"}
            </p>
            <span className="text-xs text-zinc-500">
              {state.currentVotes.length} / {activePlayers.length} voted
            </span>
          </div>

          {/* Vote tally bars */}
          <VoteTally players={activePlayers} votes={state.currentVotes} />

          {/* Vote buttons for player */}
          {myPlayer && !myPlayer.isEliminated && !hasVoted && (
            <div className="space-y-3">
              <p className="text-xs text-zinc-500">Select who should leave the camp:</p>
              <div className="grid gap-2">
                {activePlayers
                  .filter((p) => p.id !== myId)
                  .map((p) => (
                    <button
                      key={p.id}
                      onClick={() => setSelectedVote(p.id)}
                      className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-sm transition ${
                        selectedVote === p.id
                          ? "border-red-600 bg-red-950/40 text-red-300"
                          : "border-zinc-800 bg-zinc-900 text-zinc-300 hover:border-red-800"
                      }`}
                    >
                      <SeatBadge seat={p.seatNumber} />
                      {p.name}
                    </button>
                  ))}
              </div>
              <button
                disabled={!selectedVote || busyAction}
                onClick={() =>
                  doAction({ action: "cast_vote", voterId: myId, targetId: selectedVote })
                }
                className="w-full rounded-xl bg-red-700 py-3 text-sm font-semibold text-red-100 transition hover:bg-red-600 disabled:opacity-50"
              >
                Confirm Vote
              </button>
            </div>
          )}

          {hasVoted && !isHost && (
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 px-4 py-3 text-center text-sm text-zinc-500">
              Vote cast. Waiting for others…
            </div>
          )}

          {/* Round 1 skip option */}
          {state.phase === "voting" && state.currentRound === 1 && myPlayer && !myPlayer.isEliminated && (
            <button
              disabled={busyAction || state.skipVoterIds.includes(myId)}
              onClick={() => doAction({ action: "vote_skip", playerId: myId })}
              className="w-full rounded-xl border border-zinc-700 py-2 text-xs text-zinc-500 transition hover:border-zinc-500 hover:text-zinc-400 disabled:opacity-40"
            >
              {state.skipVoterIds.includes(myId)
                ? `Skip requested (${state.skipVoterIds.length} / ${Math.ceil(activePlayers.length / 2) + 1} needed)`
                : "Vote to skip (round 1 only)"}
            </button>
          )}

          {/* Host: close votes */}
          {isHost && (
            <button
              disabled={busyAction}
              onClick={() => doAction({ action: "close_votes", hostId: myId })}
              className="w-full rounded-xl bg-zinc-800 py-3 text-sm font-semibold text-zinc-200 transition hover:bg-zinc-700 disabled:opacity-50"
            >
              Close Votes & Reveal Result →
            </button>
          )}
        </div>
      </Panel>
    );
  }

  // ── Defense ───────────────────────────────────────────────────────────────
  if (state.phase === "defense") {
    const defenderId = state.pendingDefenseIds[0];
    const defender = state.players.find((p) => p.id === defenderId);
    const isMyDefense = defenderId === myId;

    return (
      <Panel>
        <div className="space-y-5">
          <p className="text-xs font-bold uppercase tracking-widest text-zinc-400">
            Personal Defense — 30 Seconds
          </p>
          <div className="rounded-xl border border-amber-800/40 bg-amber-950/20 px-5 py-4">
            <p className="text-sm text-zinc-400">Defending now:</p>
            <p className="mt-1 text-2xl font-bold text-amber-300">{defender?.name ?? "—"}</p>
            {isMyDefense && (
              <p className="mt-2 text-sm text-amber-400">
                You have 30 seconds. Argue your case — revealing hidden traits is{" "}
                <strong>not allowed</strong>.
              </p>
            )}
          </div>
          {state.pendingDefenseIds.length > 1 && (
            <p className="text-xs text-zinc-500">
              Also defending:{" "}
              {state.pendingDefenseIds
                .slice(1)
                .map((id) => state.players.find((p) => p.id === id)?.name)
                .filter(Boolean)
                .join(", ")}
            </p>
          )}
          {isHost && (
            <button
              disabled={busyAction}
              onClick={() => doAction({ action: "end_phase", hostId: myId })}
              className="w-full rounded-xl bg-zinc-800 py-3 text-sm font-semibold text-zinc-200 transition hover:bg-zinc-700 disabled:opacity-50"
            >
              {state.pendingDefenseIds.length > 1 ? "Next Defender →" : "Begin Re-Vote →"}
            </button>
          )}
        </div>
      </Panel>
    );
  }

  // ── Farewell ──────────────────────────────────────────────────────────────
  if (state.phase === "farewell") {
    const eliminated = state.players.filter((p) => p.isEliminated);
    const recent = eliminated[eliminated.length - 1];
    const isEliminated = recent?.id === myId;

    return (
      <Panel>
        <div className="space-y-5">
          <p className="text-xs font-bold uppercase tracking-widest text-zinc-400">
            Farewell — 15 Seconds
          </p>
          <div className="rounded-xl border border-red-900/50 bg-red-950/20 px-5 py-4">
            <p className="text-sm text-zinc-400">Leaving the camp:</p>
            <p className="mt-1 text-2xl font-bold text-red-400">{recent?.name ?? "—"}</p>
            {isEliminated && (
              <p className="mt-2 text-sm text-red-400">
                You&apos;ve been voted out. You may use your special ability now.
                Say your goodbyes.
              </p>
            )}
          </div>
          {isHost && (
            <button
              disabled={busyAction}
              onClick={() => doAction({ action: "end_phase", hostId: myId })}
              className="w-full rounded-xl bg-zinc-800 py-3 text-sm font-semibold text-zinc-200 transition hover:bg-zinc-700 disabled:opacity-50"
            >
              Continue →
            </button>
          )}
        </div>
      </Panel>
    );
  }

  return null;
}

// ── Ended screen ──────────────────────────────────────────────────────────────

function EndedScreen({ state, myId }: { state: BunkerGameState; myId: string }) {
  const winners = state.players.filter((p) => state.winnersInBunker.includes(p.id));
  const eliminated = state.players.filter((p) => p.isEliminated);
  const iSurvived = state.winnersInBunker.includes(myId);

  return (
    <Shell>
      <div className="mx-auto max-w-4xl px-6 py-16 space-y-12">
        {/* Hero result */}
        <div className="text-center space-y-4">
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-emerald-500">
            Game Over
          </p>
          <h1 className="text-5xl font-black tracking-tight text-zinc-100">
            {iSurvived ? "You Made It." : "You Didn't Make It."}
          </h1>
          <p className="text-zinc-500">
            {winners.length} survivor{winners.length !== 1 ? "s" : ""} entered the bunker.{" "}
            {eliminated.length} remain{eliminated.length === 1 ? "s" : ""} outside.
          </p>
        </div>

        {/* Catastrophe recap */}
        {state.catastrophe && (
          <div className="rounded-2xl border border-red-900/40 bg-red-950/20 p-6 space-y-2">
            <p className="text-xs font-semibold uppercase tracking-widest text-red-500">
              The Catastrophe
            </p>
            <h2 className="text-xl font-bold text-zinc-100">{state.catastrophe.title}</h2>
            <p className="text-sm leading-7 text-zinc-400">{state.catastrophe.description}</p>
          </div>
        )}

        {/* Survivors */}
        <div className="space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-widest text-emerald-500">
            In the Bunker
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {winners.map((player) => (
              <FullCharacterReveal key={player.id} player={player} survived />
            ))}
          </div>
        </div>

        {/* Eliminated */}
        {eliminated.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-widest text-red-500">
              Left Behind
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {eliminated.map((player) => (
                <FullCharacterReveal key={player.id} player={player} survived={false} />
              ))}
            </div>
          </div>
        )}
      </div>
    </Shell>
  );
}

// ── Scenario card ─────────────────────────────────────────────────────────────

function ScenarioCard({
  catastrophe,
  bunker,
}: {
  catastrophe: { title: string; description: string };
  bunker: { size: string; stayDuration: string; foodSupply: string; contains: string[] } | null;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-5 py-4 text-left"
      >
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-red-500">
            Active Catastrophe
          </p>
          <p className="mt-0.5 text-base font-bold text-zinc-100">{catastrophe.title}</p>
        </div>
        <span className="text-xs text-zinc-500">{open ? "▲ Hide" : "▼ Show"}</span>
      </button>

      {open && (
        <div className="border-t border-zinc-800 px-5 pb-5 pt-4 space-y-4">
          <p className="text-sm leading-7 text-zinc-400">{catastrophe.description}</p>

          {bunker && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-emerald-900/40 bg-emerald-950/20 p-4 space-y-3">
                <p className="text-xs font-semibold uppercase tracking-widest text-emerald-500">
                  Bunker
                </p>
                <dl className="space-y-1.5 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-zinc-500">Size</dt>
                    <dd className="text-zinc-200">{bunker.size}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-zinc-500">Duration</dt>
                    <dd className="text-zinc-200">{bunker.stayDuration}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-zinc-500">Food</dt>
                    <dd className="text-zinc-200">
                      {FOOD_SUPPLY_LABELS[bunker.foodSupply as keyof typeof FOOD_SUPPLY_LABELS] ??
                        bunker.foodSupply}
                    </dd>
                  </div>
                </dl>
              </div>
              <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 space-y-2">
                <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
                  Contains
                </p>
                <ul className="space-y-1">
                  {bunker.contains.map((item) => (
                    <li key={item} className="text-sm text-zinc-400">
                      · {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── My character card ─────────────────────────────────────────────────────────

function MyCharacterCard({ player }: { player: Player }) {
  return (
    <div className="rounded-2xl border border-zinc-700 bg-zinc-900 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold uppercase tracking-widest text-zinc-400">
          Your Character Card
        </p>
        <SeatBadge seat={player.seatNumber} />
      </div>
      <p className="text-xl font-black text-zinc-100">{player.name}</p>
      <div className="grid gap-2 sm:grid-cols-2">
        {CHARACTER_KEYS.map((key) => {
          const revealed = player.revealedKeys.includes(key);
          return (
            <TraitRow
              key={key}
              label={CHARACTER_LABELS[key]}
              value={player.character[key] ?? "—"}
              revealed={revealed}
              isMe
            />
          );
        })}
      </div>
    </div>
  );
}

// ── Player sidebar card ───────────────────────────────────────────────────────

function PlayerCard({
  player,
  isCurrent,
  isMe,
  isHost,
  state,
  onNote,
}: {
  player: Player;
  isCurrent: boolean;
  isMe: boolean;
  isHost: boolean;
  state: BunkerGameState;
  onNote: (note: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [noteVal, setNoteVal] = useState(player.notes);

  return (
    <div
      className={`rounded-xl border transition ${
        player.isEliminated
          ? "border-zinc-800/40 bg-zinc-900/30 opacity-40"
          : isCurrent
            ? "border-red-700/60 bg-red-950/10"
            : "border-zinc-800 bg-zinc-900"
      }`}
    >
      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left"
      >
        <SeatBadge seat={player.seatNumber} />
        <div className="flex-1 min-w-0">
          <p className="truncate text-sm font-semibold text-zinc-200">
            {player.name}
            {player.isEliminated && (
              <span className="ml-2 text-xs text-zinc-500 line-through">eliminated</span>
            )}
          </p>
          {isCurrent && !player.isEliminated && (
            <p className="text-xs text-red-400">Speaking now</p>
          )}
        </div>
        {isMe && (
          <span className="text-xs text-zinc-500">You</span>
        )}
        <span className="text-xs text-zinc-600">{expanded ? "▲" : "▼"}</span>
      </button>

      {expanded && (
        <div className="border-t border-zinc-800 px-4 pb-4 pt-3 space-y-3">
          {/* Revealed traits */}
          {player.revealedKeys.length > 0 ? (
            <div className="space-y-1.5">
              {player.revealedKeys.map((key) => (
                <TraitRow
                  key={key}
                  label={CHARACTER_LABELS[key]}
                  value={player.character[key] ?? "—"}
                  revealed
                  isMe={false}
                />
              ))}
            </div>
          ) : (
            <p className="text-xs text-zinc-600">No traits revealed yet.</p>
          )}

          {/* Hidden count */}
          {CHARACTER_KEYS.length - player.revealedKeys.length > 0 && (
            <p className="text-xs text-zinc-600">
              {CHARACTER_KEYS.length - player.revealedKeys.length} hidden traits
            </p>
          )}

          {/* Vote history for this player */}
          {state.voteHistory.some((r) => r.eliminatedIds.includes(player.id)) && (
            <p className="text-xs text-red-500">Voted out this game</p>
          )}

          {/* Notes (host only) */}
          {isHost && (
            <div className="space-y-1.5">
              <p className="text-xs text-zinc-600">Host notes</p>
              <textarea
                value={noteVal}
                onChange={(e) => setNoteVal(e.target.value)}
                onBlur={() => onNote(noteVal)}
                rows={2}
                placeholder="Add a note…"
                className="w-full resize-none rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-xs text-zinc-300 placeholder-zinc-600 outline-none focus:border-zinc-500"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Full character reveal (end screen) ────────────────────────────────────────

function FullCharacterReveal({
  player,
  survived,
}: {
  player: Player;
  survived: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-5 space-y-4 ${
        survived
          ? "border-emerald-800/50 bg-emerald-950/20"
          : "border-zinc-800 bg-zinc-900/50"
      }`}
    >
      <div className="flex items-center justify-between">
        <p
          className={`text-xs font-semibold uppercase tracking-widest ${
            survived ? "text-emerald-500" : "text-red-500"
          }`}
        >
          {survived ? "Survivor" : "Eliminated"}
        </p>
        <SeatBadge seat={player.seatNumber} />
      </div>
      <p className="text-lg font-bold text-zinc-100">{player.name}</p>
      <div className="space-y-1.5">
        {CHARACTER_KEYS.map((key) => (
          <TraitRow
            key={key}
            label={CHARACTER_LABELS[key]}
            value={player.character[key] ?? "—"}
            revealed
            isMe={false}
          />
        ))}
      </div>
    </div>
  );
}

// ── Vote tally ────────────────────────────────────────────────────────────────

function VoteTally({ players, votes }: { players: Player[]; votes: { voterId: string; targetId: string | null }[] }) {
  const tally = new Map<string, number>(players.map((p) => [p.id, 0]));
  for (const v of votes) {
    const target = v.targetId ?? v.voterId;
    tally.set(target, (tally.get(target) ?? 0) + 1);
  }
  const maxVotes = Math.max(...tally.values(), 1);

  return (
    <div className="space-y-2">
      {players.map((p) => {
        const count = tally.get(p.id) ?? 0;
        const pct = Math.round((count / maxVotes) * 100);
        return (
          <div key={p.id} className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-400">{p.name}</span>
              <span className="text-zinc-500">{count}</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
              <div
                className="h-full rounded-full bg-red-700 transition-all duration-300"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Small reusables ───────────────────────────────────────────────────────────

function TraitRow({
  label,
  value,
  revealed,
  isMe,
}: {
  label: string;
  value: string;
  revealed: boolean;
  isMe: boolean;
}) {
  return (
    <div
      className={`flex items-start gap-3 rounded-lg px-3 py-2 ${
        revealed ? "bg-zinc-800/60" : isMe ? "bg-zinc-900" : "bg-zinc-900/40"
      }`}
    >
      <span className="w-28 flex-shrink-0 text-xs font-medium text-zinc-500">{label}</span>
      <span
        className={`text-xs ${
          revealed ? "text-zinc-200" : isMe ? "text-zinc-400 italic" : "text-zinc-700"
        }`}
      >
        {revealed || isMe ? value : "Hidden"}
      </span>
      {!revealed && !isMe && (
        <span className="ml-auto text-zinc-700">🔒</span>
      )}
    </div>
  );
}

function SeatBadge({ seat }: { seat: number }) {
  return (
    <span className="inline-flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-zinc-800 text-xs font-bold text-zinc-400">
      {seat}
    </span>
  );
}

function SpeakerProgress({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-1.5">
      {Array.from({ length: total }).map((_, i) => (
        <span
          key={i}
          className={`inline-block h-1.5 w-4 rounded-full transition ${
            i < current ? "bg-zinc-700" : i === current ? "bg-red-500" : "bg-zinc-800"
          }`}
        />
      ))}
    </div>
  );
}

function Panel({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5">{children}</div>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-zinc-950 text-zinc-100">{children}</div>;
}

function Spinner({ className = "" }: { className?: string }) {
  return (
    <svg className={`h-4 w-4 animate-spin ${className}`} fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
    </svg>
  );
}

function FullScreenLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950">
      <div className="space-y-3 text-center">
        <Spinner className="mx-auto text-red-500" />
        <p className="text-sm text-zinc-500">Loading game…</p>
      </div>
    </div>
  );
}

function FullScreenError({ message }: { message: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 px-6">
      <div className="space-y-4 text-center">
        <p className="text-4xl font-black text-red-500">!</p>
        <p className="text-zinc-400">{message}</p>
        <a href="/bunker" className="text-sm text-zinc-500 underline hover:text-zinc-300">
          Back to Bunker Online
        </a>
      </div>
    </div>
  );
}

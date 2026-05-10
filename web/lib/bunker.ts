// Character attribute keys — profession is always first (mandatory reveal in round 1)
export const CHARACTER_KEYS = [
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
] as const;

export type CharacterKey = (typeof CHARACTER_KEYS)[number];

export const CHARACTER_LABELS: Record<CharacterKey, string> = {
  profession: "Profession",
  gender: "Gender",
  bodyType: "Body Type",
  humanTrait: "Human Trait",
  health: "Health",
  hobby: "Hobby",
  phobia: "Phobia",
  largeEquipment: "Large Equipment",
  backpack: "Backpack",
  additionalInfo: "Additional Info",
  specialAbility: "Special Ability",
};

export type Character = Record<CharacterKey, string>;

export type Catastrophe = {
  title: string;
  description: string;
};

export type BunkerInfo = {
  size: string;
  stayDuration: string;
  foodSupply: "abundant" | "adequate" | "scarce" | "none";
  contains: string[];
};

export type Player = {
  id: string;
  name: string;
  seatNumber: number;
  character: Character;
  revealedKeys: CharacterKey[];
  isEliminated: boolean;
  hasUsedDefense: boolean;
  notes: string;
};

export type VoteRecord = {
  voterId: string;
  targetId: string | null; // null = abstain, counts against the abstaining voter
};

export type VoteOutcome =
  | { type: "landslide"; eliminatedId: string }
  | { type: "plurality"; candidateId: string }
  | { type: "tie"; candidateIds: string[] }
  | { type: "no_contest" };

export type RoundVoteRecord = {
  round: number;
  phase: 1 | 2;
  votes: VoteRecord[];
  outcome: VoteOutcome;
  eliminatedIds: string[];
  skipped: boolean;
};

export type GamePhase =
  | "lobby"
  | "introduction"
  | "group_discussion"
  | "accusation"
  | "voting"
  | "defense"
  | "repeated_voting"
  | "farewell"
  | "ended";

export type BunkerGameState = {
  type: "bunker";
  hostId: string;
  catastrophe: Catastrophe | null;
  bunker: BunkerInfo | null;
  players: Player[];
  initialPlayerCount: number;
  currentRound: number;
  currentSpeakerIndex: number;
  phase: GamePhase;
  skipVoterIds: string[];
  pendingDefenseIds: string[];
  currentVotes: VoteRecord[];
  voteHistory: RoundVoteRecord[];
  winnersInBunker: string[];
  generating: boolean;
};

// ── Reveal count table (from official rules) ─────────────────────────────────
// counts[0]=R1, counts[1]=R2, counts[2]=R3, counts[3]=R4+
type RevealRow = { min: number; max: number; counts: [number, number, number, number] };

const REVEAL_COUNTS: RevealRow[] = [
  { min: 6, max: 6, counts: [3, 3, 2, 0] },
  { min: 7, max: 8, counts: [3, 2, 2, 1] },
  { min: 9, max: 10, counts: [3, 2, 1, 1] },
  { min: 11, max: 12, counts: [2, 2, 1, 1] },
  { min: 13, max: 15, counts: [2, 1, 1, 1] },
];

export function getRevealCount(initialPlayerCount: number, round: number): number {
  const row = REVEAL_COUNTS.find(
    (r) => initialPlayerCount >= r.min && initialPlayerCount <= r.max,
  );
  return row ? row.counts[Math.min(round - 1, 3)] : 1;
}

export function getBunkerCapacity(initialPlayerCount: number): number {
  return Math.floor(initialPlayerCount / 2);
}

// Odd rounds: clockwise (ascending seat number). Even rounds: reverse.
export function getRoundSpeakingOrder(players: Player[], round: number): Player[] {
  const active = players
    .filter((p) => !p.isEliminated)
    .sort((a, b) => a.seatNumber - b.seatNumber);
  return round % 2 === 0 ? [...active].reverse() : active;
}

export function computeVoteOutcome(votes: VoteRecord[], eligibleIds: string[]): VoteOutcome {
  const tally = new Map<string, number>(eligibleIds.map((id) => [id, 0]));

  for (const vote of votes) {
    const target = vote.targetId ?? vote.voterId; // abstain = vote against yourself
    if (tally.has(target)) {
      tally.set(target, (tally.get(target) ?? 0) + 1);
    }
  }

  const total = votes.length;
  const sorted = [...tally.entries()]
    .filter(([id]) => eligibleIds.includes(id))
    .sort((a, b) => b[1] - a[1]);

  if (!sorted.length) return { type: "no_contest" };

  const [topId, topCount] = sorted[0];

  if (topCount >= total * 0.7) return { type: "landslide", eliminatedId: topId };

  const topVotes = sorted[0][1];
  const tied = sorted.filter(([, c]) => c === topVotes).map(([id]) => id);

  if (tied.length > 1) return { type: "tie", candidateIds: tied };

  return { type: "plurality", candidateId: topId };
}

export function shouldSkipVote(skipCount: number, activePlayers: number): boolean {
  return skipCount > activePlayers / 2;
}

export function isGameOver(state: BunkerGameState): boolean {
  const active = state.players.filter((p) => !p.isEliminated).length;
  return active <= getBunkerCapacity(state.initialPlayerCount);
}

export function createInitialState(hostId: string): BunkerGameState {
  return {
    type: "bunker",
    hostId,
    catastrophe: null,
    bunker: null,
    players: [],
    initialPlayerCount: 0,
    currentRound: 1,
    currentSpeakerIndex: 0,
    phase: "lobby",
    skipVoterIds: [],
    pendingDefenseIds: [],
    currentVotes: [],
    voteHistory: [],
    winnersInBunker: [],
    generating: false,
  };
}

export function normalizeBunkerState(raw: unknown): BunkerGameState | null {
  if (!raw || typeof raw !== "object") return null;
  const src = raw as Record<string, unknown>;
  if (src.type !== "bunker") return null;

  return {
    type: "bunker",
    hostId: typeof src.hostId === "string" ? src.hostId : "",
    catastrophe: (src.catastrophe as Catastrophe | null) ?? null,
    bunker: (src.bunker as BunkerInfo | null) ?? null,
    players: Array.isArray(src.players) ? (src.players as Player[]) : [],
    initialPlayerCount:
      typeof src.initialPlayerCount === "number" ? src.initialPlayerCount : 0,
    currentRound: typeof src.currentRound === "number" ? src.currentRound : 1,
    currentSpeakerIndex:
      typeof src.currentSpeakerIndex === "number" ? src.currentSpeakerIndex : 0,
    phase: (src.phase as GamePhase) ?? "lobby",
    skipVoterIds: Array.isArray(src.skipVoterIds) ? (src.skipVoterIds as string[]) : [],
    pendingDefenseIds: Array.isArray(src.pendingDefenseIds)
      ? (src.pendingDefenseIds as string[])
      : [],
    currentVotes: Array.isArray(src.currentVotes) ? (src.currentVotes as VoteRecord[]) : [],
    voteHistory: Array.isArray(src.voteHistory) ? (src.voteHistory as RoundVoteRecord[]) : [],
    winnersInBunker: Array.isArray(src.winnersInBunker)
      ? (src.winnersInBunker as string[])
      : [],
    generating: typeof src.generating === "boolean" ? src.generating : false,
  };
}

// ── AI setup prompt ───────────────────────────────────────────────────────────

export function buildSetupPrompt(playerCount: number): string {
  const schema = `{
  "catastrophe": {
    "title": "string — dramatic catastrophe name",
    "description": "string — 2-3 vivid sentences: what happened, why, and survival challenges"
  },
  "bunker": {
    "size": "string — e.g. '200 square meters'",
    "stayDuration": "string — e.g. '3 years'",
    "foodSupply": "abundant | adequate | scarce | none",
    "contains": ["3-5 items inside the bunker that may aid survival"]
  },
  "characters": [
    {
      "profession": "string",
      "gender": "string",
      "bodyType": "string — physique",
      "humanTrait": "string — defining personality or human quality",
      "health": "string — health status and conditions",
      "hobby": "string",
      "phobia": "string",
      "largeEquipment": "string — one large item they carry",
      "backpack": "string — backpack contents",
      "additionalInfo": "string — one surprising or unusual fact",
      "specialAbility": "string — unique skill usable once to influence a vote"
    }
  ]
}`;

  return [
    "You are setting up a tense, dramatic survival game called Bunker Online.",
    "Return ONLY valid JSON. No markdown, no prose outside the JSON.",
    `Generate a complete game setup for ${playerCount} players using this exact shape:`,
    schema,
    `Generate exactly ${playerCount} diverse characters in the 'characters' array.`,
    "Character rules:",
    "— Professions must be wildly varied: artists, teachers, retirees, criminals, tradespeople, scientists, etc.",
    "— Do NOT include obvious survival heroes like doctors, soldiers, or engineers as the majority.",
    "— Phobias and human traits should create uncomfortable social dynamics.",
    "— Health conditions can be limiting or game-relevant (allergies, disabilities, chronic illness).",
    "— Special abilities must be clever and could realistically sway a vote.",
    "— At least one character should have clearly questionable survival value.",
    "— Make the catastrophe vivid, specific, and scientifically plausible.",
    "— Bunker contents should create interesting trade-offs with character skills.",
  ].join("\n");
}

export function parseSetupPayload(
  output: string,
  playerCount: number,
): { catastrophe: Catastrophe; bunker: BunkerInfo; characters: Character[] } {
  const cleaned = output
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();

  const parsed = JSON.parse(cleaned) as Record<string, unknown>;

  const catastrophe = parsed.catastrophe as Catastrophe;
  if (!catastrophe?.title || !catastrophe?.description) {
    throw new Error("Invalid catastrophe in AI response.");
  }

  const rawBunker = parsed.bunker as Record<string, unknown>;
  if (!rawBunker?.size || !rawBunker?.stayDuration) {
    throw new Error("Invalid bunker in AI response.");
  }

  const validFood = ["abundant", "adequate", "scarce", "none"] as const;
  const foodSupply = validFood.includes(rawBunker.foodSupply as (typeof validFood)[number])
    ? (rawBunker.foodSupply as BunkerInfo["foodSupply"])
    : "adequate";

  const bunker: BunkerInfo = {
    size: String(rawBunker.size),
    stayDuration: String(rawBunker.stayDuration),
    foodSupply,
    contains: Array.isArray(rawBunker.contains)
      ? (rawBunker.contains as unknown[]).map(String)
      : [],
  };

  const rawChars = Array.isArray(parsed.characters) ? parsed.characters : [];
  if (rawChars.length < playerCount) {
    throw new Error(`Expected ${playerCount} characters, got ${rawChars.length}.`);
  }

  const characters: Character[] = rawChars.slice(0, playerCount).map((c) => {
    const char = c as Record<string, unknown>;
    return CHARACTER_KEYS.reduce(
      (acc, key) => {
        acc[key] = typeof char[key] === "string" ? (char[key] as string) : "Unknown";
        return acc;
      },
      {} as Character,
    );
  });

  return { catastrophe, bunker, characters };
}

// ── Phase label helpers ───────────────────────────────────────────────────────

export const PHASE_LABELS: Record<GamePhase, string> = {
  lobby: "Waiting Room",
  introduction: "Introductions",
  group_discussion: "Group Discussion",
  accusation: "Accusations & Defense",
  voting: "Voting",
  defense: "Personal Defense",
  repeated_voting: "Re-Vote",
  farewell: "Farewell",
  ended: "Game Over",
};

export const FOOD_SUPPLY_LABELS: Record<BunkerInfo["foodSupply"], string> = {
  abundant: "Abundant",
  adequate: "Adequate",
  scarce: "Scarce",
  none: "None — must leave bunker to forage",
};

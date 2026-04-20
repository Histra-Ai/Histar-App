export type MetricKey =
  | "treasury"
  | "military"
  | "stability"
  | "influence"
  | "tension";

export type ScenarioNeighbor = {
  name: string;
  relationship: "hostile" | "rival" | "neutral" | "ally";
};

export type ScenarioContext = {
  id: string;
  countryName: string;
  era: string;
  year: number;
  crisisName: string;
  contextParagraph: string;
  neighbors: ScenarioNeighbor[];
};

export type Scenario = ScenarioContext & {
  description: string;
  difficulty: "easy" | "medium" | "hard";
  startingMetrics: Record<MetricKey, number>;
  historicalRuler: { name: string; trait: string; legitimacy: number; age: number };
  objective: Objective;
};

export type Objective = {
  key: MetricKey;
  title: string;
  description: string;
  target: number;
};

export type Ruler = {
  name: string;
  trait: string;
  legitimacy: number;
  age: number;
};

export type PendingConsequence = {
  id: string;
  summary: string;
  triggerTurn: number;
  risk: "low" | "medium" | "high";
};

export type EndingSummary = {
  verdict: string;
  score: number;
  achievedObjective: boolean;
  summary: string;
};

export type GameState = {
  treasury: number;
  military: number;
  stability: number;
  influence: number;
  tension: number;
  lastNarrative: string | null;
  recentEvents: string[];
  recentCliffhanger: string | null;
  worldSummary: string | null;
  objective: Objective;
  ruler: Ruler;
  pendingConsequences: PendingConsequence[];
  ending: EndingSummary | null;
  scenario: ScenarioContext | null;
};

export type StateDelta = {
  key: MetricKey;
  amount: number;
  reason: string;
};

export type TurnEvent = {
  headline: string;
  detail: string;
};

export type TurnPayload = {
  narrative: string;
  deltas: StateDelta[];
  events: TurnEvent[];
};

export type RecentTurn = {
  turn_number: number;
  player_input: string;
  narrative: string | null;
};

export type ServerTurnEffects = {
  state: GameState;
  events: TurnEvent[];
  deltas: StateDelta[];
  notes: string[];
};

export const MAX_TURNS = 12;

const OBJECTIVES: Objective[] = [
  {
    key: "stability",
    title: "Hold The Realm Together",
    description: "Keep internal order intact long enough to survive the crisis years.",
    target: 70,
  },
  {
    key: "influence",
    title: "Become The Power Broker",
    description: "Turn diplomatic pressure into regional dominance.",
    target: 72,
  },
  {
    key: "military",
    title: "Forge A Steel Frontier",
    description: "Build an army strong enough to make rivals hesitate.",
    target: 72,
  },
  {
    key: "treasury",
    title: "Fill The War Chest",
    description: "Create enough economic strength to outlast every rival gamble.",
    target: 72,
  },
];

const RULER_NAMES = [
  "Elian Varros",
  "Mara Illyan",
  "Tomas Vey",
  "Sera Dalmont",
  "Lucan Rhes",
  "Nadia Orsini",
  "Caspar Dren",
  "Livia Thessan",
  "Oren Falke",
  "Dara Voss",
  "Silvan Krael",
  "Ysabel Morn",
  "Hadric Solenne",
  "Petra Vayne",
  "Coll Brandis",
  "Emra Dust",
];

const RULER_TRAITS = [
  "audacious",
  "coldly pragmatic",
  "beloved but impulsive",
  "paranoid",
  "reform-minded",
  "militaristic",
  "charismatic but vain",
  "scholarly",
  "vengeful",
  "mercantile",
  "traditionalist",
  "ruthless",
];

const TRAIT_VOICE: Record<string, string> = {
  "audacious": "Bold gambits define this reign. Prose should crackle with urgency — this ruler moves fast and expects the world to keep up.",
  "coldly pragmatic": "Every action is a transaction. Strip sentiment. Name the cost and the gain plainly.",
  "beloved but impulsive": "Warmth and volatility in equal measure. Good instincts undercut by bad timing. People forgive, then worry.",
  "paranoid": "Trust no one. Every ally is a contingency. Decisions are layered in suspicion and defensive in character.",
  "reform-minded": "Ideals meet entrenched power. Change is possible but never clean. Resistance comes from inside as much as outside.",
  "militaristic": "Force is the first language. Strength commands respect. Hesitation reads as weakness.",
  "charismatic but vain": "Image is power. How this looks matters as much as what it achieves. Reputation is the real currency.",
  "scholarly": "Deliberate and information-driven. Patience over aggression. The ruler reads the room before acting.",
  "vengeful": "Old grievances animate current decisions. Rivals from the past are never forgotten or forgiven.",
  "mercantile": "Everything has a price. Loyalty is an investment. Alliances hold only as long as they pay.",
  "traditionalist": "Old oaths and old precedent bind the realm. Change is suspect. New ideas must wear old clothes to survive.",
  "ruthless": "Obstacles are removed. Sentiment is a liability. The goal is the only thing that matters.",
};

const SCENARIOS: Scenario[] = [
  {
    id: "england-1337",
    countryName: "England",
    era: "Hundred Years' War",
    year: 1337,
    crisisName: "Edward's Claim",
    description:
      "Edward III has challenged Philip VI's right to the French throne. War is coming — but so is the question of whether England can sustain it.",
    difficulty: "medium",
    startingMetrics: { treasury: 45, military: 55, stability: 60, influence: 40, tension: 40 },
    historicalRuler: { name: "Edward III", trait: "audacious", legitimacy: 65, age: 25 },
    objective: {
      key: "influence",
      title: "Establish English Supremacy",
      description:
        "Turn the military campaign into lasting diplomatic dominance over the continent.",
      target: 72,
    },
    neighbors: [
      { name: "France", relationship: "hostile" },
      { name: "Scotland", relationship: "hostile" },
      { name: "Flanders", relationship: "rival" },
      { name: "Burgundy", relationship: "neutral" },
      { name: "Castile", relationship: "neutral" },
    ],
    contextParagraph:
      "Edward III has formally claimed the French throne through his mother Isabella, daughter of Philip IV. The French crown passed to Philip VI of Valois, which Edward contests as illegitimate. War is inevitable — but timing, allies, and resources will determine whether this becomes a glorious campaign or a ruinous overreach. The Flemish cloth cities resent French taxes and are open to English partnership. Scotland threatens the northern border through its alliance with France. The English longbow gives tactical advantage on the field; sustaining a continental campaign demands treasury discipline and noble loyalty across two kingdoms.",
  },
  {
    id: "ottoman-1683",
    countryName: "Ottoman Empire",
    era: "The Great Siege",
    year: 1683,
    crisisName: "Vienna or Ruin",
    description:
      "Grand Vizier Kara Mustafa leads the largest Ottoman force in a generation toward Vienna. Success reshapes Europe. Failure ends careers — and lives.",
    difficulty: "hard",
    startingMetrics: { treasury: 55, military: 70, stability: 60, influence: 55, tension: 55 },
    historicalRuler: {
      name: "Kara Mustafa Pasha",
      trait: "militaristic",
      legitimacy: 60,
      age: 51,
    },
    objective: {
      key: "military",
      title: "Breach the Gates of Vienna",
      description:
        "Sustain the siege and break Habsburg resistance before a relief force can arrive.",
      target: 75,
    },
    neighbors: [
      { name: "Habsburg Austria", relationship: "hostile" },
      { name: "Poland-Lithuania", relationship: "hostile" },
      { name: "Venice", relationship: "hostile" },
      { name: "Wallachia", relationship: "neutral" },
      { name: "Hungary", relationship: "neutral" },
    ],
    contextParagraph:
      "Grand Vizier Kara Mustafa Pasha commands the largest Ottoman force in a generation — over a hundred thousand men marching on Vienna, the Habsburg capital. Sultan Mehmed IV remains in Belgrade. A successful siege would crack the heart of Christian Europe and reshape the continent's balance of power for generations. But logistics are stretched hundreds of miles across hostile terrain, Jan Sobieski of Poland is known to be mobilizing a relief force, and the Venetians are raiding Ottoman shipping in the Adriatic. The campaign must succeed — failure in front of Vienna would be catastrophic, politically and personally.",
  },
  {
    id: "prussia-1740",
    countryName: "Prussia",
    era: "War of Austrian Succession",
    year: 1740,
    crisisName: "The Silesian Gamble",
    description:
      "Frederick II has inherited Prussia and sees opportunity in Austria's succession crisis. One bold move could define his reign — or end it.",
    difficulty: "medium",
    startingMetrics: { treasury: 40, military: 60, stability: 65, influence: 35, tension: 45 },
    historicalRuler: {
      name: "Frederick II",
      trait: "coldly pragmatic",
      legitimacy: 70,
      age: 28,
    },
    objective: {
      key: "military",
      title: "Hold Silesia",
      description:
        "Seize and consolidate Silesia before Austria can recover and marshal a response.",
      target: 70,
    },
    neighbors: [
      { name: "Austria", relationship: "hostile" },
      { name: "Saxony", relationship: "rival" },
      { name: "France", relationship: "ally" },
      { name: "Russia", relationship: "neutral" },
      { name: "Sweden", relationship: "neutral" },
    ],
    contextParagraph:
      "Frederick II has just inherited Prussia from his father Frederick William I. Austria's empress Maria Theresa faces a contested succession — Bavaria, France, and Spain all question her legitimacy. Silesia, the richest Habsburg province, lies adjacent to Prussia's border. An invasion now would be decisive if rapid, catastrophic if prolonged. Prussia's army is the finest in Germany, drilled to a standard no European force can easily match. But it is small. France, Russia, and Britain are watching carefully to see whether this young king is a serious force or an overreaching gambler.",
  },
  {
    id: "byzantium-1453",
    countryName: "Byzantium",
    era: "The Final Siege",
    year: 1453,
    crisisName: "The Last Wall",
    description:
      "Constantine XI defends Constantinople against Mehmed II's overwhelming force. The city may fall — but how it falls, and how long it holds, is still to be written.",
    difficulty: "hard",
    startingMetrics: { treasury: 20, military: 25, stability: 40, influence: 20, tension: 80 },
    historicalRuler: {
      name: "Constantine XI Palaiologos",
      trait: "traditionalist",
      legitimacy: 75,
      age: 49,
    },
    objective: {
      key: "stability",
      title: "Hold the City",
      description:
        "Keep the walls manned and the garrison cohesive long enough for relief to become possible.",
      target: 55,
    },
    neighbors: [
      { name: "Ottoman Empire", relationship: "hostile" },
      { name: "Genoa", relationship: "neutral" },
      { name: "Venice", relationship: "rival" },
      { name: "Serbia", relationship: "hostile" },
      { name: "Papal States", relationship: "neutral" },
    ],
    contextParagraph:
      "Emperor Constantine XI Palaiologos governs the last remnant of the Roman Empire — Constantinople itself, a walled city of fifty thousand souls surrounded by eighty thousand Ottoman troops under Sultan Mehmed II. The Theodosian walls that held for a thousand years now face cannon that can breach stone. The garrison numbers barely seven thousand men, supplemented by Genoese mercenaries under Giovanni Giustiniani. Venice promised a fleet; it has not arrived. The Pope offered western crusade in exchange for union of the Orthodox and Catholic churches — but Greek priests and citizens resist bitterly. Every day the walls hold is a miracle already earned.",
  },
  {
    id: "spain-1519",
    countryName: "Spain",
    era: "The Comuneros Crisis",
    year: 1519,
    crisisName: "A Foreign King",
    description:
      "Charles I arrives as a stranger to his own kingdom. The Castilian cities are ready to revolt. The New World is being seized without his permission. He must hold it together.",
    difficulty: "medium",
    startingMetrics: { treasury: 60, military: 50, stability: 35, influence: 55, tension: 55 },
    historicalRuler: { name: "Charles I", trait: "reform-minded", legitimacy: 50, age: 19 },
    objective: {
      key: "stability",
      title: "Consolidate the Crowns",
      description:
        "Bring Castile and Aragon under unified authority before rebellion tears them apart.",
      target: 60,
    },
    neighbors: [
      { name: "France", relationship: "rival" },
      { name: "Portugal", relationship: "neutral" },
      { name: "Papal States", relationship: "neutral" },
      { name: "England", relationship: "neutral" },
      { name: "Navarre", relationship: "hostile" },
    ],
    contextParagraph:
      "Charles of Habsburg has inherited Castile and Aragon through his grandparents Ferdinand and Isabella, then accepted election as Holy Roman Emperor. He arrives as a foreigner — barely nineteen, speaking no Spanish, attended by Flemish advisors, extracting Castilian wealth for imperial ambitions across Europe. The Castilian cities — Toledo, Segovia, Salamanca — are on the edge of open revolt under the Comunero banner, demanding a Spanish-born king who governs Spain for Spain. Meanwhile Hernán Cortés, acting without authorization, has marched into Mexico and is advancing on Tenochtitlan. Charles must hold his Spanish inheritance together while managing an empire none of his predecessors could have imagined.",
  },
  {
    id: "france-1789",
    countryName: "France",
    era: "The Revolution",
    year: 1789,
    crisisName: "The Estates-General",
    description:
      "Louis XVI has called the Estates-General in desperation. The Third Estate has already broken away. The Bastille still stands, but only just.",
    difficulty: "hard",
    startingMetrics: { treasury: 20, military: 50, stability: 30, influence: 45, tension: 70 },
    historicalRuler: {
      name: "Louis XVI",
      trait: "beloved but impulsive",
      legitimacy: 50,
      age: 35,
    },
    objective: {
      key: "stability",
      title: "Survive the Storm",
      description: "Navigate the revolutionary crisis without losing the crown or the country.",
      target: 55,
    },
    neighbors: [
      { name: "Austria", relationship: "rival" },
      { name: "Prussia", relationship: "rival" },
      { name: "Britain", relationship: "rival" },
      { name: "Spain", relationship: "ally" },
      { name: "Netherlands", relationship: "neutral" },
    ],
    contextParagraph:
      "King Louis XVI has called the Estates-General for the first time in 175 years — a desperate measure to address France's fiscal collapse after decades of war and court excess. The Third Estate has broken away and declared itself a National Assembly, asserting the sovereignty of the French people against the crown. In Paris, bread prices have doubled and the streets are volatile. The Bastille still stands, but barely. Austria's emperor, Louis's brother-in-law, watches with alarm as the contagion threatens to spread. The army is divided between loyalty and sympathy with the people. The question is no longer whether France will transform, but whether the monarchy survives the transformation — and whether Louis can steer it.",
  },
];

export function getScenarios(): Scenario[] {
  return SCENARIOS;
}

export function getScenarioById(id: string): Scenario | undefined {
  return SCENARIOS.find((s) => s.id === id);
}

function hashString(input: string): number {
  let hash = 0;

  for (let index = 0; index < input.length; index += 1) {
    hash = (hash * 31 + input.charCodeAt(index)) >>> 0;
  }

  return hash;
}

function chooseObjective(gameId: string): Objective {
  return OBJECTIVES[hashString(gameId) % OBJECTIVES.length];
}

function chooseRuler(gameId: string): Ruler {
  const name = RULER_NAMES[hashString(`${gameId}:name`) % RULER_NAMES.length];
  const trait = RULER_TRAITS[hashString(`${gameId}:trait`) % RULER_TRAITS.length];

  return {
    name,
    trait,
    legitimacy: 55,
    age: 42,
  };
}

export function getInitialState(gameId: string, scenario?: Scenario): GameState {
  return {
    treasury: scenario?.startingMetrics.treasury ?? 50,
    military: scenario?.startingMetrics.military ?? 50,
    stability: scenario?.startingMetrics.stability ?? 50,
    influence: scenario?.startingMetrics.influence ?? 50,
    tension: scenario?.startingMetrics.tension ?? 20,
    lastNarrative: null,
    recentEvents: [],
    recentCliffhanger: scenario
      ? `${scenario.crisisName} — the opening move will define what follows.`
      : "The first move will define the entire balance of power.",
    worldSummary: null,
    objective: scenario?.objective ?? chooseObjective(gameId),
    ruler: scenario ? { ...scenario.historicalRuler } : chooseRuler(gameId),
    pendingConsequences: [],
    ending: null,
    scenario: scenario
      ? {
          id: scenario.id,
          countryName: scenario.countryName,
          era: scenario.era,
          year: scenario.year,
          crisisName: scenario.crisisName,
          contextParagraph: scenario.contextParagraph,
          neighbors: scenario.neighbors,
        }
      : null,
  };
}

export function normalizeState(state: unknown): GameState {
  const fallback = getInitialState("fallback");

  if (!state || typeof state !== "object") {
    return fallback;
  }

  const source = state as Partial<GameState>;
  const objective =
    source.objective &&
    typeof source.objective === "object" &&
    typeof source.objective.title === "string" &&
    typeof source.objective.description === "string" &&
    typeof source.objective.target === "number" &&
    source.objective.key
      ? (source.objective as Objective)
      : fallback.objective;

  const ruler =
    source.ruler &&
    typeof source.ruler === "object" &&
    typeof source.ruler.name === "string" &&
    typeof source.ruler.trait === "string"
      ? {
          name: source.ruler.name,
          trait: source.ruler.trait,
          legitimacy:
            typeof source.ruler.legitimacy === "number"
              ? source.ruler.legitimacy
              : fallback.ruler.legitimacy,
          age: typeof source.ruler.age === "number" ? source.ruler.age : fallback.ruler.age,
        }
      : fallback.ruler;

  const scenario =
    source.scenario &&
    typeof source.scenario === "object" &&
    typeof source.scenario.id === "string" &&
    typeof source.scenario.countryName === "string"
      ? (source.scenario as ScenarioContext)
      : fallback.scenario;

  const pendingConsequences = Array.isArray(source.pendingConsequences)
    ? source.pendingConsequences
        .filter(
          (item): item is PendingConsequence =>
            !!item &&
            typeof item === "object" &&
            typeof item.id === "string" &&
            typeof item.summary === "string" &&
            typeof item.triggerTurn === "number" &&
            (item.risk === "low" || item.risk === "medium" || item.risk === "high"),
        )
        .slice(0, 6)
    : fallback.pendingConsequences;

  return {
    treasury: typeof source.treasury === "number" ? source.treasury : fallback.treasury,
    military: typeof source.military === "number" ? source.military : fallback.military,
    stability: typeof source.stability === "number" ? source.stability : fallback.stability,
    influence: typeof source.influence === "number" ? source.influence : fallback.influence,
    tension: typeof source.tension === "number" ? source.tension : fallback.tension,
    lastNarrative:
      typeof source.lastNarrative === "string" ? source.lastNarrative : fallback.lastNarrative,
    recentEvents: Array.isArray(source.recentEvents)
      ? source.recentEvents.filter((item): item is string => typeof item === "string").slice(0, 5)
      : fallback.recentEvents,
    recentCliffhanger:
      typeof source.recentCliffhanger === "string"
        ? source.recentCliffhanger
        : fallback.recentCliffhanger,
    worldSummary:
      typeof source.worldSummary === "string" ? source.worldSummary : fallback.worldSummary,
    objective,
    ruler,
    pendingConsequences,
    ending:
      source.ending &&
      typeof source.ending === "object" &&
      typeof source.ending.verdict === "string" &&
      typeof source.ending.summary === "string" &&
      typeof source.ending.score === "number" &&
      typeof source.ending.achievedObjective === "boolean"
        ? (source.ending as EndingSummary)
        : fallback.ending,
    scenario,
  };
}

export function clampMetric(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function cleanJsonBlock(text: string): string {
  return text.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/, "").trim();
}

export function parseTurnPayload(outputText: string): TurnPayload {
  const cleaned = cleanJsonBlock(outputText);
  const parsed = JSON.parse(cleaned) as Partial<TurnPayload>;

  if (typeof parsed.narrative !== "string" || parsed.narrative.trim().length < 30) {
    throw new Error("Model response narrative is missing or too short.");
  }

  const deltas = Array.isArray(parsed.deltas)
    ? parsed.deltas
        .map((delta) => {
          if (!delta || typeof delta !== "object") {
            return null;
          }

          const candidate = delta as Partial<StateDelta>;
          const validKeys: MetricKey[] = [
            "treasury",
            "military",
            "stability",
            "influence",
            "tension",
          ];

          if (
            !candidate.key ||
            !validKeys.includes(candidate.key) ||
            typeof candidate.amount !== "number"
          ) {
            return null;
          }

          return {
            key: candidate.key,
            amount: Math.max(-15, Math.min(15, Math.round(candidate.amount))),
            reason:
              typeof candidate.reason === "string" && candidate.reason.trim()
                ? candidate.reason.trim()
                : "No reason provided.",
          } satisfies StateDelta;
        })
        .filter((delta): delta is StateDelta => delta !== null)
    : [];

  const events = Array.isArray(parsed.events)
    ? parsed.events
        .map((event) => {
          if (!event || typeof event !== "object") {
            return null;
          }

          const candidate = event as Partial<TurnEvent>;

          if (typeof candidate.headline !== "string" || typeof candidate.detail !== "string") {
            return null;
          }

          return {
            headline: candidate.headline.trim(),
            detail: candidate.detail.trim(),
          } satisfies TurnEvent;
        })
        .filter((event): event is TurnEvent => Boolean(event?.headline && event.detail))
        .slice(0, 3)
    : [];

  return {
    narrative: parsed.narrative.trim(),
    deltas,
    events,
  };
}

export function applyDeltas(
  state: GameState,
  deltas: StateDelta[],
  narrative: string,
  events: TurnEvent[],
) {
  const nextState: GameState = {
    ...state,
    recentEvents: [...state.recentEvents],
    pendingConsequences: [...state.pendingConsequences],
    ruler: { ...state.ruler },
  };

  for (const delta of deltas) {
    nextState[delta.key] = clampMetric(nextState[delta.key] + delta.amount);
  }

  nextState.lastNarrative = narrative;
  nextState.recentEvents = [
    ...events.map((event) => event.headline),
    ...nextState.recentEvents,
  ].slice(0, 5);
  nextState.ruler.legitimacy = clampMetric(
    nextState.ruler.legitimacy + Math.round((nextState.stability - 50) / 12),
  );

  return nextState;
}

export function formatRecentTurns(turns: RecentTurn[]) {
  if (!turns.length) {
    return "No previous turns yet.";
  }

  return turns
    .map((turn) =>
      [
        `Turn ${turn.turn_number}`,
        `Player action: ${turn.player_input}`,
        `Outcome: ${turn.narrative ?? "No recorded narrative."}`,
      ].join("\n"),
    )
    .join("\n\n");
}

export function compactTurns(turns: RecentTurn[]): string {
  if (!turns.length) return "";

  return turns
    .map((turn) => {
      const outcome = turn.narrative
        ? turn.narrative.slice(0, 140).trimEnd() + (turn.narrative.length > 140 ? "…" : "")
        : "no recorded outcome";

      return `Turn ${turn.turn_number}: ${turn.player_input} → ${outcome}`;
    })
    .join(" | ");
}

function formatPendingConsequences(pendingConsequences: PendingConsequence[]) {
  if (!pendingConsequences.length) {
    return "No delayed consequences are currently hanging over the state.";
  }

  return pendingConsequences
    .slice(0, 4)
    .map(
      (item) =>
        `Due on turn ${item.triggerTurn}: ${item.summary} (risk: ${item.risk})`,
    )
    .join("\n");
}

export function buildPrompt(
  playerInput: string,
  state: GameState,
  turnNumber: number,
  recentTurns: RecentTurn[],
  serverNotes: string[],
  worldSummary: string | null,
) {
  const traitVoice = TRAIT_VOICE[state.ruler.trait] ?? "Write with a sense of consequence.";

  return [
    state.scenario
      ? `You are the narrator of an alternate-history political chronicle set in ${state.scenario.countryName}, ${state.scenario.year}.`
      : "You are the narrator of an alternate-history political chronicle.",
    "Return valid JSON only. No markdown, no prose outside the JSON.",
    "Use this exact shape:",
    '{ "narrative": "string", "deltas": [{ "key": "treasury|military|stability|influence|tension", "amount": -10, "reason": "string" }], "events": [{ "headline": "string", "detail": "string" }] }',
    "NARRATIVE RULES:",
    "• 3 to 5 sentences.",
    "• Open with a specific event, person, or location — never 'You' or 'The ruler' as the first word.",
    "• Include at least one proper noun (a name, a city, a faction, a title).",
    "• Close with a sentence that names a threat, raises a question, or creates anticipation.",
    `• Ruler voice: ${state.ruler.name} is ${state.ruler.trait}. ${traitVoice}`,
    "DELTA RULES: amounts between -12 and +12. At most 3 deltas and 3 events. Keep changes grounded and proportionate.",
    "Maintain strict continuity. Reference prior events by name when relevant. Do not restart the world.",
    `Turn ${turnNumber} of ${MAX_TURNS}.`,
    state.scenario
      ? `Historical setting: ${state.scenario.countryName}, ${state.scenario.year} — ${state.scenario.crisisName} (${state.scenario.era}).`
      : "",
    state.scenario ? `Context: ${state.scenario.contextParagraph}` : "",
    state.scenario
      ? `Neighboring powers: ${state.scenario.neighbors.map((n) => `${n.name} (${n.relationship})`).join(", ")}.`
      : "",
    `Objective: ${state.objective.title} — ${state.objective.description} Target: ${state.objective.key} ≥ ${state.objective.target}.`,
    `Ruler: ${state.ruler.name}, ${state.ruler.trait}, legitimacy ${state.ruler.legitimacy}, age ${state.ruler.age}.`,
    `State: ${JSON.stringify({
      treasury: state.treasury,
      military: state.military,
      stability: state.stability,
      influence: state.influence,
      tension: state.tension,
      recentCliffhanger: state.recentCliffhanger,
    })}`,
    worldSummary ? `Earlier history:\n${worldSummary}` : "",
    `Recent turns:\n${formatRecentTurns(recentTurns)}`,
    `Pending consequences:\n${formatPendingConsequences(state.pendingConsequences)}`,
    serverNotes.length ? `Events at turn start:\n${serverNotes.join("\n")}` : "",
    `Player's decision: ${playerInput}`,
  ]
    .filter(Boolean)
    .join("\n");
}

function createPendingId(playerInput: string, turnNumber: number) {
  return `${turnNumber}-${hashString(playerInput).toString(16)}`;
}

export function createPendingConsequences(
  playerInput: string,
  turnNumber: number,
): PendingConsequence[] {
  const input = playerInput.toLowerCase();
  const pending: PendingConsequence[] = [];

  if (
    /(coup|plot|spy|infiltrat|sabotage|conspir|scheme)/.test(input)
  ) {
    pending.push({
      id: createPendingId(`${playerInput}:shadow`, turnNumber),
      summary: "A covert gamble is still unfolding beneath the surface.",
      triggerTurn: turnNumber + 2,
      risk: "high",
    });
  }

  if (/(treaty|ultimatum|alliance|diplom|promise|truce)/.test(input)) {
    pending.push({
      id: createPendingId(`${playerInput}:diplomatic`, turnNumber),
      summary: "Foreign courts are weighing whether to honor or exploit your move.",
      triggerTurn: turnNumber + 2,
      risk: "medium",
    });
  }

  if (/(tax|grain|reform|mobiliz|conscript|fortif|build)/.test(input)) {
    pending.push({
      id: createPendingId(`${playerInput}:domestic`, turnNumber),
      summary: "The domestic costs of this decision have not fully surfaced yet.",
      triggerTurn: turnNumber + 1,
      risk: "medium",
    });
  }

  return pending.slice(0, 2);
}

function consequenceOutcome(id: string, turnNumber: number) {
  return hashString(`${id}:${turnNumber}`) % 100;
}

export function resolveServerTurnEffects(state: GameState, turnNumber: number): ServerTurnEffects {
  let workingState: GameState = {
    ...state,
    recentEvents: [...state.recentEvents],
    pendingConsequences: [...state.pendingConsequences],
    ruler: { ...state.ruler },
  };
  const events: TurnEvent[] = [];
  const deltas: StateDelta[] = [];
  const notes: string[] = [];

  const due = workingState.pendingConsequences.filter((item) => item.triggerTurn <= turnNumber);
  workingState.pendingConsequences = workingState.pendingConsequences.filter(
    (item) => item.triggerTurn > turnNumber,
  );

  for (const pending of due) {
    const roll = consequenceOutcome(pending.id, turnNumber);
    const success = pending.risk === "high" ? roll > 55 : pending.risk === "medium" ? roll > 45 : roll > 35;

    if (success) {
      const positiveDeltas: StateDelta[] = [
        {
          key: "influence",
          amount: pending.risk === "high" ? 8 : 5,
          reason: "A delayed gamble finally paid off.",
        },
        {
          key: "tension",
          amount: 4,
          reason: "Success still unsettled the political field.",
        },
      ];

      deltas.push(...positiveDeltas);
      events.push({
        headline: "A delayed gamble paid off",
        detail: pending.summary,
      });
      notes.push(`A pending consequence resolved in your favor: ${pending.summary}`);
      workingState = applyDeltas(
        workingState,
        positiveDeltas,
        workingState.lastNarrative ?? "A delayed gamble paid off.",
        [],
      );
    } else {
      const negativeDeltas: StateDelta[] = [
        {
          key: "stability",
          amount: pending.risk === "high" ? -8 : -5,
          reason: "A delayed gamble backfired.",
        },
        {
          key: "tension",
          amount: 6,
          reason: "The backlash sharpened political conflict.",
        },
      ];

      deltas.push(...negativeDeltas);
      events.push({
        headline: "A delayed gamble backfired",
        detail: pending.summary,
      });
      notes.push(`A pending consequence turned against you: ${pending.summary}`);
      workingState = applyDeltas(
        workingState,
        negativeDeltas,
        workingState.lastNarrative ?? "A delayed gamble backfired.",
        [],
      );
    }
  }

  if (workingState.stability < 35) {
    const revoltDeltas: StateDelta[] = [
      { key: "stability", amount: -4, reason: "Internal unrest is spreading." },
      { key: "tension", amount: 5, reason: "Street unrest has become a political threat." },
    ];
    deltas.push(...revoltDeltas);
    events.push({
      headline: "Internal unrest is spreading",
      detail: "Whispers of rebellion and panic are weakening the state from within.",
    });
    notes.push("Internal unrest escalated at the start of the turn.");
    workingState = applyDeltas(
      workingState,
      revoltDeltas,
      workingState.lastNarrative ?? "Internal unrest is spreading.",
      [],
    );
  }

  if (workingState.stability < 20 || workingState.ruler.legitimacy < 25) {
    const successorName =
      RULER_NAMES[hashString(`${workingState.ruler.name}:${turnNumber}`) % RULER_NAMES.length];
    const successorTrait =
      RULER_TRAITS[hashString(`${workingState.ruler.trait}:${turnNumber}`) % RULER_TRAITS.length];

    if (successorName !== workingState.ruler.name) {
      workingState.ruler = {
        name: successorName,
        trait: successorTrait,
        legitimacy: 45,
        age: 36 + (hashString(`${successorName}:${turnNumber}`) % 20),
      };
      events.push({
        headline: "Power changed hands",
        detail: `A succession crisis elevated ${successorName}, a ${successorTrait} figure, to the center of power.`,
      });
      notes.push(`A succession crisis changed the ruler to ${successorName}.`);
    }
  }

  return { state: workingState, events, deltas, notes };
}

export function buildCliffhanger(state: GameState, upcomingTurn: number): string {
  const nextPending = state.pendingConsequences
    .slice()
    .sort((left, right) => left.triggerTurn - right.triggerTurn)[0];

  if (nextPending) {
    const urgency =
      nextPending.risk === "high"
        ? "Something dangerous is still unresolved"
        : "An earlier decision has not yet fully landed";
    return `${urgency} — due on turn ${nextPending.triggerTurn}: ${nextPending.summary}`;
  }

  if (state.stability < 20) {
    return `The state is fracturing. ${state.ruler.name}'s next decision may be the last one that carries any real authority.`;
  }

  if (state.ruler.legitimacy < 25) {
    return `${state.ruler.name}'s grip on power is slipping. Rivals are quietly positioning for what comes next.`;
  }

  if (state.stability < 35) {
    return "Unrest has moved from whispers to open grumbling. One more misstep and it becomes something harder to contain.";
  }

  if (state.tension > 80) {
    return "The situation is a single spark from open conflict. Every move will be read as either provocation or weakness.";
  }

  if (state.tension > 65) {
    return "Foreign courts are watching every dispatch. The next decision will be tested for signs of hesitation.";
  }

  if (state.treasury < 20) {
    return "The treasury is nearly empty. Without coin, promises are all that hold the alliance together — and promises fray.";
  }

  if (state.military < 20) {
    return "The army is dangerously thin. Rivals have noticed the gaps in the frontier, and they are patient.";
  }

  if (state.influence > 75) {
    return "The realm's position is strong, which has made its enemies careful. They will move when the moment favors them, not before.";
  }

  if (upcomingTurn >= MAX_TURNS) {
    return "The final reckoning is here. What remains will be judged not by intention but by outcome.";
  }

  const generics = [
    "The realm holds — for now. Hidden debts are still being called in.",
    "Something is shifting beneath the surface. The next turn may reveal what.",
    "Rivals are calculating their response. The pause before a storm has its own weight.",
    "The balance of power is unsettled. Alliances that looked solid are quietly being tested.",
    "A decision of this kind always produces echoes. The next move will feel them.",
  ];

  return generics[
    hashString(`cliffhanger:${upcomingTurn}:${state.stability}:${state.tension}`) % generics.length
  ];
}

export function computeEnding(state: GameState): EndingSummary {
  const objectiveValue = state[state.objective.key];
  const achievedObjective = objectiveValue >= state.objective.target;
  const score = clampMetric(
    Math.round(
      (state.treasury +
        state.military +
        state.stability +
        state.influence +
        (100 - state.tension) +
        state.ruler.legitimacy) /
        6,
    ),
  );

  const verdictIndex = hashString(`verdict:${state.ruler.name}:${score}`) % 3;

  let verdict = "";

  if (achievedObjective && state.stability >= 45) {
    verdict = [
      "You bent history without letting the state break.",
      "The objective was met and the realm held. That combination is rarer than it looks.",
      `${state.ruler.name} leaves behind a realm that is stronger than the one inherited. History will note it.`,
    ][verdictIndex];
  } else if (achievedObjective) {
    verdict = [
      "You achieved the objective, but the realm paid for it in nerves and scars.",
      "The goal was reached, though the cost showed up in cracks that will take years to repair.",
      "Objective met — but at a price. The chronicles will argue about whether it was worth it.",
    ][verdictIndex];
  } else if (state.stability < 25) {
    verdict = [
      "The state survived the campaign, but authority cracked from within.",
      "The objective slipped away while internal order was being held together with promises.",
      `${state.ruler.name} endured, but the realm is more fragile at the end than at the beginning.`,
    ][verdictIndex];
  } else if (state.tension > 75) {
    verdict = [
      "You left behind a charged peace that looks one breath away from renewed crisis.",
      "The objective was missed and tension is high. The next ruler inherits a volatile inheritance.",
      "Stability holds — barely. But the region is still one miscalculation from open conflict.",
    ][verdictIndex];
  } else {
    verdict = [
      "You endured, but history will remember the campaign as unfinished.",
      "The realm survived intact, but the original objective was never reached. A competent stalemate.",
      `${state.ruler.name} kept the state together without achieving the defining ambition. Capable, but incomplete.`,
    ][verdictIndex];
  }

  const summary = achievedObjective
    ? `Your core objective was ${state.objective.title.toLowerCase()}, and you ended with ${state.objective.key} at ${objectiveValue}.`
    : `Your core objective was ${state.objective.title.toLowerCase()}, but ${state.objective.key} only reached ${objectiveValue} against a target of ${state.objective.target}.`;

  return {
    verdict,
    score,
    achievedObjective,
    summary,
  };
}

export function buildRecap(turns: RecentTurn[], state: GameState) {
  if (!turns.length) {
    return "No turns have been played yet. The state is still waiting for its opening move.";
  }

  const lastTurn = turns[turns.length - 1];
  const eventText = state.recentEvents.length
    ? `Recent flashpoints: ${state.recentEvents.join(", ")}.`
    : "No major flashpoints have been recorded yet.";

  return [
    state.scenario
      ? `Setting: ${state.scenario.countryName}, ${state.scenario.year} — ${state.scenario.crisisName}.`
      : null,
    `Objective: ${state.objective.title}. ${state.objective.description}`,
    `The current ruler is ${state.ruler.name}, a ${state.ruler.trait} figure with legitimacy at ${state.ruler.legitimacy}.`,
    `You are returning on turn ${lastTurn.turn_number}.`,
    `Most recently, the player chose to: ${lastTurn.player_input}.`,
    lastTurn.narrative ? `That led to: ${lastTurn.narrative}` : null,
    `Current balance: treasury ${state.treasury}, military ${state.military}, stability ${state.stability}, influence ${state.influence}, tension ${state.tension}.`,
    eventText,
    state.recentCliffhanger ? `Cliffhanger: ${state.recentCliffhanger}` : null,
    state.ending ? `Ending verdict: ${state.ending.verdict}` : null,
  ]
    .filter(Boolean)
    .join(" ");
}

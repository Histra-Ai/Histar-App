/**
 * Week 4 eval harness.
 *
 * Runs 5 representative fixture scenarios through the live turn API and
 * reports a table of: schema_ok, latency_ms, cost_usd, tokens, standout.
 *
 * Usage:
 *   node --env-file=../.env.local scripts/eval-turn.mjs
 *
 * Requires the Next.js dev server to be running on BASE_URL (default
 * http://localhost:3000). Each fixture creates a fresh game so results
 * are independent. Pass --verbose to see the full narrative per turn.
 */

const BASE_URL = process.env.EVAL_BASE_URL ?? "http://localhost:3000";
const VERBOSE = process.argv.includes("--verbose");

// 5 representative fixture scenarios: label + sequence of player actions.
// Each sequence is played in order against a fresh game.
const FIXTURES = [
  {
    label: "Early – balanced opening",
    actions: ["Strengthen border defenses and call reserves to the frontier."],
  },
  {
    label: "Diplomatic – treaty then exploit",
    actions: [
      "Offer a trade treaty to the eastern neighbor.",
      "Push a territorial ultimatum while their court is still deliberating.",
    ],
  },
  {
    label: "Stability crisis – reform under pressure",
    actions: [
      "Raise taxes on the merchant class to fund the army.",
      "Offer grain relief to rebellious southern provinces.",
      "Conscript levies from the northern cities despite protests.",
    ],
  },
  {
    label: "Covert – shadow campaign",
    actions: [
      "Infiltrate the rival's court with a spy ring.",
      "Sabotage their grain stores before winter.",
    ],
  },
  {
    label: "Military – steel frontier push",
    actions: [
      "Mobilize the full standing army to the disputed border.",
      "Fortify the captured pass and dig in for a siege.",
      "Send an ultimatum: surrender or face total encirclement.",
    ],
  },
];

async function runTurn(gameId, playerInput) {
  const res = await fetch(`${BASE_URL}/api/turn`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ gameId: gameId ?? undefined, playerInput }),
  });

  const data = await res.json();

  return { ok: res.ok, status: res.status, data };
}

function fmt(n, decimals = 0) {
  return n.toFixed(decimals);
}

function row(cols) {
  return cols.map((c) => String(c).padEnd(c._pad ?? 12)).join("  ");
}

const COL_WIDTHS = {
  fixture: 38,
  turn: 5,
  schema: 7,
  retried: 8,
  latency: 11,
  tokens: 13,
  cost: 10,
  standout: 9,
};

function header() {
  return [
    "Fixture".padEnd(COL_WIDTHS.fixture),
    "Turn".padEnd(COL_WIDTHS.turn),
    "OK".padEnd(COL_WIDTHS.schema),
    "Retried".padEnd(COL_WIDTHS.retried),
    "Latency ms".padEnd(COL_WIDTHS.latency),
    "In+Out tok".padEnd(COL_WIDTHS.tokens),
    "Cost USD".padEnd(COL_WIDTHS.cost),
    "Standout".padEnd(COL_WIDTHS.standout),
  ].join("  ");
}

function divider() {
  return "-".repeat(header().length);
}

function dataRow(label, turnNum, result) {
  const m = result.data?.metrics;
  const ok = result.ok ? "yes" : "FAIL";
  const retried = m?.parse_retried ? "yes" : "no";
  const latency = m ? fmt(m.latency_ms) + " ms" : "—";
  const tokens = m ? `${m.input_tokens}+${m.output_tokens}` : "—";
  const cost = m ? `$${m.cost_usd.toFixed(6)}` : "—";
  const standout = m?.standout ? "YES" : "—";

  return [
    label.padEnd(COL_WIDTHS.fixture),
    String(turnNum).padEnd(COL_WIDTHS.turn),
    ok.padEnd(COL_WIDTHS.schema),
    retried.padEnd(COL_WIDTHS.retried),
    latency.padEnd(COL_WIDTHS.latency),
    tokens.padEnd(COL_WIDTHS.tokens),
    cost.padEnd(COL_WIDTHS.cost),
    standout.padEnd(COL_WIDTHS.standout),
  ].join("  ");
}

const allResults = [];
let totalCost = 0;
let totalLatency = 0;
let totalTurns = 0;
let totalFails = 0;

console.log(`\nEval harness  →  ${BASE_URL}\n`);
console.log(header());
console.log(divider());

for (const fixture of FIXTURES) {
  let gameId = null;

  for (const [i, action] of fixture.actions.entries()) {
    const turnNum = i + 1;
    const result = await runTurn(gameId, action);

    if (result.ok) {
      gameId = result.data.gameId;
    }

    const m = result.data?.metrics;

    if (m) {
      totalCost += m.cost_usd;
      totalLatency += m.latency_ms;
      totalTurns += 1;
    }

    if (!result.ok) {
      totalFails += 1;
    }

    const label = turnNum === 1 ? fixture.label : "";
    console.log(dataRow(label, turnNum, result));

    if (VERBOSE && result.data?.narrative) {
      console.log(`  → ${result.data.narrative.slice(0, 120)}…`);
    }

    allResults.push({ fixture: fixture.label, turnNum, result });
  }

  console.log();
}

console.log(divider());

if (totalTurns > 0) {
  console.log(
    `\nTotals  turns=${totalTurns}  fails=${totalFails}  ` +
      `avg_latency=${fmt(totalLatency / totalTurns)} ms  ` +
      `total_cost=$${totalCost.toFixed(6)}\n`,
  );
} else {
  console.log(
    `\nAll ${FIXTURES.length} fixtures failed. Is the dev server running at ${BASE_URL}?\n`,
  );
}

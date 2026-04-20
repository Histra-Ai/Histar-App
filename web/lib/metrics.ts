import type { TurnEvent } from "./game";

export type TurnMetrics = {
  latency_ms: number;
  input_tokens: number;
  output_tokens: number;
  cost_usd: number;
  parse_ok: boolean;
  parse_retried: boolean;
  standout: boolean;
};

const COST_PER_M: Record<string, { input: number; output: number }> = {
  "gpt-4.1-mini": { input: 0.4, output: 1.6 },
  "gpt-4.1": { input: 2.0, output: 8.0 },
  "gpt-4o-mini": { input: 0.15, output: 0.6 },
  "gpt-4o": { input: 2.5, output: 10.0 },
};

export function estimateCost(model: string, inputTokens: number, outputTokens: number): number {
  const key = model.replace(/^openai\//, "");
  const p = COST_PER_M[key] ?? { input: 1.0, output: 4.0 };
  return (inputTokens * p.input + outputTokens * p.output) / 1_000_000;
}

export function detectStandout(
  events: TurnEvent[],
  stability: number,
  tension: number,
  gameOver: boolean,
): boolean {
  if (gameOver) return true;
  if (stability < 20 || tension > 80) return true;
  return events.some(
    (e) =>
      e.headline === "Power changed hands" ||
      e.headline === "A delayed gamble paid off" ||
      e.headline === "A delayed gamble backfired",
  );
}

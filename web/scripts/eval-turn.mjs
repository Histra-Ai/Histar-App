import OpenAI from "openai";

const apiKey = process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY;
const baseURL = process.env.OPENROUTER_API_KEY
  ? "https://openrouter.ai/api/v1"
  : undefined;
const model = process.env.OPENROUTER_API_KEY
  ? process.env.OPENROUTER_MODEL || "openai/gpt-4.1-mini"
  : process.env.OPENAI_MODEL || "gpt-4.1-mini";

if (!apiKey) {
  console.error("Missing OPENAI_API_KEY or OPENROUTER_API_KEY.");
  process.exit(1);
}

const client = new OpenAI({
  apiKey,
  baseURL,
});

const prompts = [
  "Fortify the capital and call reserve units to the border.",
  "Offer grain relief to rebellious provinces while blaming foreign agitators.",
  "Push a risky diplomatic ultimatum against a weaker neighbor.",
];

for (const [index, prompt] of prompts.entries()) {
  const response = await client.responses.create({
    model,
    input: [
      "You are evaluating tone for an alternate-history strategy game.",
      "Respond in 2-3 sentences only.",
      `Player action: ${prompt}`,
    ].join("\n"),
  });

  console.log(`\n=== Eval ${index + 1} ===`);
  console.log(`Action: ${prompt}`);
  console.log(response.output_text?.trim() || "[no text returned]");
}

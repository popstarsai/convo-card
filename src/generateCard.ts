/**
 * generateCard.ts
 * Builds a structured AgentCard from processed history.
 */

import { keccak256, toBytes } from "viem";
import type { ConversationInput, AgentCard } from "./types.js";
import { processHistory } from "./processHistory.js";

/**
 * Generates a complete AgentCard from user input.
 */
export function generateCard(input: ConversationInput): AgentCard {
  const processed = processHistory(input);

  const name = input.name?.trim() || "Founder";
  const description =
    input.bio?.trim() ||
    "Founder whose living resume is their real AI conversation history and work.";

  const github = (input.githubRepos || [])
    .map((g) => g.trim())
    .filter(Boolean);

  // Build the core object that will be hashed
  const cardCore = {
    name,
    description,
    historySummary: processed.historySummary,
    keyTopics: processed.keyTopics,
    skills: processed.skills,
    github,
    source: (github.length > 0 ? "mixed" : "gemini-history") as AgentCard["source"],
    version: "0.1" as const,
  };

  // Create a deterministic string for hashing
  const hashInput = JSON.stringify(cardCore, Object.keys(cardCore).sort());
  const contentHash = keccak256(toBytes(hashInput));

  const card: AgentCard = {
    ...cardCore,
    contentHash,
    generatedAt: new Date().toISOString(),
    extra: {
      originalLength: input.rawHistory.length,
      cleanedLength: processed.cleanedText.length,
    },
  };

  return card;
}

/**
 * Helper to turn the card into a metadataURI (data URI for v0.1)
 */
export function cardToDataURI(card: AgentCard): string {
  // ERC-8004 registration envelope. Keep custom ConvoCard fields and their hash.
  // No agentId/registrations claim exists until the registry confirms a mint.
  // TODO(v0.2): Add actual service endpoints and confirmed registration metadata.
  const json = JSON.stringify({
    ...card,
    type: "https://eips.ethereum.org/EIPS/eip-8004#registration-v1",
    services: [],
    active: false,
    x402Support: false,
  }, null, 2);
  const base64 = Buffer.from(json).toString("base64");
  return `data:application/json;base64,${base64}`;
}

/**
 * Pretty print for debugging
 */
export function printCard(card: AgentCard) {
  console.log("\n========== ConvoCard ==========");
  console.log(`Name:          ${card.name}`);
  console.log(`Description:   ${card.description}`);
  console.log(`Content Hash:  ${card.contentHash}`);
  console.log(`Topics:        ${card.keyTopics.join(", ") || "—"}`);
  console.log(`Skills:        ${card.skills.join(", ") || "—"}`);
  console.log(`GitHub:        ${card.github.join(", ") || "—"}`);
  console.log(`Generated:     ${card.generatedAt}`);
  console.log("================================\n");
}
/**
 * scripts/register.ts
 * Simple CLI to generate a card from sample data and register it.
 * Usage: npx tsx scripts/register.ts
 */

import "dotenv/config";
import { generateCard, printCard } from "../src/generateCard.js";
import { registerAgent } from "../src/registerAgent.js";
import type { ConversationInput } from "../src/types.js";

async function main() {
  console.log("\n=== ConvoCard Registration Script ===\n");

  // Example input – replace with real OCR text later
  const input: ConversationInput = {
    name: "Alin Eugen Costin",
    bio: "Founder whose living resume is his real AI conversation history.",
    rawHistory: `
      Recent conversations about building AI agents, ERC-8004 identity,
      Arc blockchain, agentic development, ownership stacks,
      Rust plugins, Lightning physics equations, and turning
      conversation history into on-chain business cards.
    `,
    githubRepos: [
      "https://github.com/popstarsai/convo-card",
    ],
  };

  // 1. Generate the card
  const card = generateCard(input);
  printCard(card);

  // 2. Register on Arc
  const result = await registerAgent(card, {
    rpcUrl: process.env.ARC_RPC_URL || "https://rpc.testnet.arc.io",
    chainId: Number(process.env.ARC_CHAIN_ID || 5042002),
    identityRegistry: (process.env.IDENTITY_REGISTRY ||
      "0x8004A818BFB912233c491871b3d84c89A494BD9e") as `0x${string}`,
    privateKey: process.env.PRIVATE_KEY as `0x${string}`,
  });

  if (result.success) {
    console.log("\n✅ Registration successful!");
    console.log("Agent ID:     ", result.agentId ?? "not extracted");
    console.log("Tx Hash:      ", result.txHash);
    console.log("Explorer:     ", result.explorerUrl);
    console.log("Metadata URI: ", result.metadataURI?.slice(0, 80) + "...");
  } else {
    console.error("\n❌ Registration failed:");
    console.error(result.error);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
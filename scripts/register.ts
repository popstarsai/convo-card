/** Register the user's exported input; --dry-run is entirely offline. */
import "dotenv/config";
import { parseArgs } from "node:util";
import { generateCard, cardToDataURI } from "../src/generateCard.js";
import { registerAgent, ARC_TESTNET, DEFAULT_IDENTITY_REGISTRY } from "../src/registerAgent.js";
import { readConversationInput } from "./input.js";

async function main() {
  const { values } = parseArgs({ options: {
    input: { type: "string" }, "dry-run": { type: "boolean", default: false },
  }, allowPositionals: false });
  const card = generateCard(await readConversationInput(values.input));
  const config = {
    rpcUrl: process.env.ARC_RPC_URL || ARC_TESTNET.rpcUrls.default.http[0],
    chainId: Number(process.env.ARC_CHAIN_ID || ARC_TESTNET.id),
    identityRegistry: (process.env.IDENTITY_REGISTRY || DEFAULT_IDENTITY_REGISTRY) as `0x${string}`,
    privateKey: process.env.PRIVATE_KEY as `0x${string}` | undefined,
  };

  if (values["dry-run"]) {
    console.log(JSON.stringify({
      status: "dry-run", submitted: false, card,
      target: { chainId: config.chainId, rpcUrl: config.rpcUrl, identityRegistry: config.identityRegistry },
      functionName: "register", metadataURI: cardToDataURI(card),
    }, null, 2));
    return;
  }

  console.log("Submitting the reviewed card to Arc Testnet:", card.name);
  const result = await registerAgent(card, config);
  console.log(JSON.stringify(result, null, 2));
  if (!result.success) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Registration failed.");
  process.exitCode = 1;
});

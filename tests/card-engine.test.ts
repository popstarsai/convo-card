import test from "node:test";
import assert from "node:assert/strict";
import { createHash, webcrypto } from "node:crypto";
import { generateCard as generateCoreCard, cardToDataURI } from "../src/generateCard.js";
import { processHistory as processCoreHistory } from "../src/processHistory.js";
import { ARC_TESTNET, DEFAULT_IDENTITY_REGISTRY } from "../src/registerAgent.js";
import {
  ARC_TESTNET_CONFIG, createConversationInput, parseGitHubRepos, processHistory,
  generateCard, computeCardDigest, prepareArcRegistration,
} from "../web/card-engine.js";

if (!globalThis.crypto) Object.defineProperty(globalThis, "crypto", { value: webcrypto, configurable: true });

const inputs = [
  { rawHistory: "  TypeScript  and Python\r\n\n\nAI agents, Arc and ERC-8004 identity.  " },
  { name: " Alin 🪪 ", bio: " Cercetare și AI. ", rawHistory: "ChatGPT, Rust, React, Next.js, blockchain and smart contracts. ".repeat(20), githubRepos: ["https://github.com/popstarsai/convo-card"] },
  { rawHistory: "A quiet conversation about music.", name: "", bio: "", githubRepos: [] },
];

for (const [index, input] of inputs.entries()) {
  test(`browser preview and TypeScript core agree for input ${index + 1}`, () => {
    assert.deepEqual(processHistory(input), processCoreHistory(input));
    const preview = generateCard(input);
    const { contentHash, generatedAt, ...core } = generateCoreCard(input);
    const { generatedAt: previewTime, ...browser } = preview;
    assert.deepEqual(browser, core);
    assert.match(contentHash, /^0x[0-9a-f]{64}$/);
    assert.equal(contentHash, generateCoreCard(input).contentHash);
    assert.ok(Number.isFinite(Date.parse(generatedAt)) && Number.isFinite(Date.parse(previewTime)));
    assert.ok(!("contentHash" in preview) && !("registrations" in preview));
  });
}

test("browser and registrar target the same Arc Testnet registry", () => {
  assert.equal(ARC_TESTNET_CONFIG.chainId, ARC_TESTNET.id);
  assert.equal(Number(ARC_TESTNET_CONFIG.chainIdHex), ARC_TESTNET.id);
  assert.equal(ARC_TESTNET_CONFIG.rpcUrl, ARC_TESTNET.rpcUrls.default.http[0]);
  assert.equal(ARC_TESTNET_CONFIG.identityRegistryAddress, DEFAULT_IDENTITY_REGISTRY);
});

test("form adapter preserves history and normalizes real repository URLs", () => {
  const input = createConversationInput({ name: " Alin ", rawHistory: " Hello \n",
    githubReposText: "https://github.com/popstarsai/convo-card.git\nhttps://github.com/PopStarsAI/convo-card/" });
  assert.equal(input.name, "Alin");
  assert.equal(input.rawHistory, " Hello \n");
  assert.deepEqual(input.githubRepos, ["https://github.com/popstarsai/convo-card"]);
  for (const url of ["https://evilgithub.com/a/b", "https://github.com.evil.test/a/b", "javascript:alert(1)", "https://github.com/a/b/tree/main", "https://secret@github.com/a/b"]) {
    assert.throws(() => parseGitHubRepos(url), /GitHub repository URLs/);
  }
  assert.throws(() => createConversationInput({ rawHistory: "   " }), /history/);
});

test("preparation is honest, offline, and uses a real checksum of the exact Unicode preview", async () => {
  const card = generateCard(inputs[1]);
  const prep = await prepareArcRegistration(card);
  assert.equal(prep.submitted, false);
  assert.equal(prep.status, "prepared");
  assert.equal(prep.metadataURI, null);
  assert.equal(prep.checksum.algorithm, "SHA-256");
  assert.equal(prep.checksum.value, "0x" + createHash("sha256").update(JSON.stringify(card, null, 2)).digest("hex"));
  assert.notEqual(await computeCardDigest({ ...card, name: "Other" }), prep.checksum.value);
  assert.match(prep.cli.dryRun, /--input conversation-input.json --dry-run$/);
  assert.match(prep.cli.register, /--input conversation-input.json$/);
  assert.doesNotMatch(JSON.stringify(prep), /PENDING_IPFS|agentId|txHash/);
  await assert.rejects(prepareArcRegistration(null), /Generate a card/);
});

test("missing Web Crypto gives an actionable error instead of a fabricated hash", async () => {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, "crypto");
  Object.defineProperty(globalThis, "crypto", { value: undefined, configurable: true });
  try {
    await assert.rejects(computeCardDigest(generateCard(inputs[0])), /HTTPS or localhost/);
  } finally {
    if (descriptor) Object.defineProperty(globalThis, "crypto", descriptor);
  }
});

test("final metadata decodes to a real registration file without a false mint claim", () => {
  const card = generateCoreCard(inputs[1]);
  const uri = cardToDataURI(card);
  assert.match(uri, /^data:application\/json;base64,/);
  const metadata = JSON.parse(Buffer.from(uri.split(",")[1], "base64").toString("utf8"));
  assert.equal(metadata.name, card.name);
  assert.equal(metadata.contentHash, card.contentHash);
  assert.equal(metadata.type, "https://eips.ethereum.org/EIPS/eip-8004#registration-v1");
  assert.equal(metadata.active, false);
  assert.deepEqual(metadata.services, []);
  assert.ok(!("rawHistory" in metadata) && !("registrations" in metadata));
});

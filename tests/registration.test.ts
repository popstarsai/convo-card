import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { encodeAbiParameters, encodeEventTopics, parseAbi, type Address, type Log } from "viem";
import { generateCard } from "../src/generateCard.js";
import { registerAgent, readRegistrationReceipt, DEFAULT_IDENTITY_REGISTRY } from "../src/registerAgent.js";

const owner = "0x1111111111111111111111111111111111111111" as Address;
const other = "0x2222222222222222222222222222222222222222" as Address;
const txHash = `0x${"ab".repeat(32)}` as `0x${string}`;
const metadataURI = "data:application/json;base64,e30=";
const abi = parseAbi(["event Registered(uint256 indexed agentId, string agentURI, address indexed owner)"]);
function log(id: bigint, address = DEFAULT_IDENTITY_REGISTRY as Address, recipient = owner, uri = metadataURI): Log {
  return {
    address, topics: encodeEventTopics({ abi, eventName: "Registered", args: { agentId: id, owner: recipient } }),
    data: encodeAbiParameters([{ type: "string" }], [uri]),
    blockHash: txHash, blockNumber: 1n, transactionHash: txHash,
    transactionIndex: 0, logIndex: 0, removed: false,
  };
}

test("receipt extraction filters registry, owner and URI, and preserves Agent ID zero", () => {
  const result = readRegistrationReceipt({ status: "success", transactionHash: txHash,
    logs: [log(99n, other), log(98n, DEFAULT_IDENTITY_REGISTRY, other), log(97n, DEFAULT_IDENTITY_REGISTRY, owner, "different"), log(0n)] },
  DEFAULT_IDENTITY_REGISTRY, owner, metadataURI);
  assert.equal(result.success, true);
  assert.equal(result.agentId, "0");
  assert.equal(result.txHash, txHash);
  assert.equal(result.explorerUrl, `https://explorer.testnet.arc.io/tx/${txHash}`);
});

test("a reverted receipt is a failure even if its supplied logs claim a mint", () => {
  const result = readRegistrationReceipt({ status: "reverted", transactionHash: txHash, logs: [log(4n)] }, DEFAULT_IDENTITY_REGISTRY, owner, metadataURI);
  assert.equal(result.success, false);
  assert.equal(result.agentId, undefined);
  assert.match(result.error!, /reverted/);
  assert.equal(result.txHash, txHash);
});

test("a successful receipt without a matching event is not proof of registration", () => {
  const result = readRegistrationReceipt({ status: "success", transactionHash: txHash, logs: [] }, DEFAULT_IDENTITY_REGISTRY, owner, metadataURI);
  assert.equal(result.success, false);
  assert.match(result.error!, /no matching Registered event/);
  assert.equal(result.agentId, undefined);
});

test("invalid registration settings fail before networking", async () => {
  const card = generateCard({ rawHistory: "AI agents in TypeScript" });
  const config = { chainId: 5042002, rpcUrl: "http://127.0.0.1:9", identityRegistry: DEFAULT_IDENTITY_REGISTRY };
  assert.match((await registerAgent(card, config)).error!, /PRIVATE_KEY/);
  assert.match((await registerAgent(card, { ...config, chainId: 1 })).error!, /5042002/);
  assert.match((await registerAgent(card, { ...config, identityRegistry: `0x${"0".repeat(40)}` })).error!, /non-zero/);
});

test("a wrong-chain RPC is rejected without simulation or a transaction", async () => {
  const methods: string[] = [];
  const server = createServer(async (req, res) => {
    let body = "";
    for await (const chunk of req) body += chunk;
    const request = JSON.parse(body);
    methods.push(request.method);
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ jsonrpc: "2.0", id: request.id, result: "0x1" }));
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  try {
    const address = server.address();
    assert.ok(address && typeof address !== "string");
    const result = await registerAgent(generateCard({ rawHistory: "TypeScript AI agents" }), {
      chainId: 5042002, identityRegistry: DEFAULT_IDENTITY_REGISTRY,
      rpcUrl: `http://127.0.0.1:${address.port}`,
      // Public deterministic test scalar, never used on an external network.
      privateKey: `0x${"0".repeat(63)}1`,
    });
    assert.equal(result.success, false);
    assert.match(result.error!, /RPC chain/);
    assert.deepEqual(methods, ["eth_chainId"]);
  } finally {
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});

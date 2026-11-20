import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createConversationInput, generateCard } from "../web/card-engine.js";

function run(script: string, args: string[]) {
  return spawnSync(process.execPath, ["--import", "tsx", script, ...args], {
    encoding: "utf8", timeout: 15000,
    env: { ...process.env, PRIVATE_KEY: "", ARC_CHAIN_ID: "5042002",
      IDENTITY_REGISTRY: "0x8004A818BFB912233c491871b3d84c89A494BD9e", ARC_RPC_URL: "http://127.0.0.1:9" },
  });
}

test("downloaded browser input reaches both CLI commands without a key or reachable RPC", async () => {
  const dir = await mkdtemp(join(tmpdir(), "convo-card-"));
  try {
    const input = createConversationInput({ name: "My own card 🪪", rawHistory: "I build AI agents in TypeScript.\nUsing Arc with Python.", githubReposText: "https://github.com/popstarsai/convo-card" });
    const path = join(dir, "conversation-input.json");
    await writeFile(path, JSON.stringify(input));
    const generated = run("scripts/generate.ts", ["--input", path]);
    assert.equal(generated.status, 0, generated.stderr);
    const card = JSON.parse(generated.stdout);
    assert.equal(card.name, input.name);
    assert.equal(card.historySummary, generateCard(input).historySummary);
    assert.match(card.contentHash, /^0x[0-9a-f]{64}$/);
    const dryRun = run("scripts/register.ts", ["--input", path, "--dry-run"]);
    assert.equal(dryRun.status, 0, dryRun.stderr);
    const prep = JSON.parse(dryRun.stdout);
    assert.equal(prep.status, "dry-run");
    assert.equal(prep.submitted, false);
    assert.equal(prep.card.name, input.name);
    assert.equal(prep.card.contentHash, card.contentHash);
    assert.match(prep.metadataURI, /^data:application\/json;base64,/);
    assert.ok(!dryRun.stdout.includes('"privateKey"'));

    await writeFile(path, JSON.stringify({ name: "Wrong export", rawHistory: " " }));
    const invalid = run("scripts/register.ts", ["--input", path, "--dry-run"]);
    assert.equal(invalid.status, 1);
    assert.match(invalid.stderr, /rawHistory/);
    await writeFile(path, '{invalid');
    assert.equal(run("scripts/generate.ts", ["--input", path]).status, 1);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test("no command silently registers or generates the old embedded sample", () => {
  for (const script of ["scripts/generate.ts", "scripts/register.ts"]) {
    const result = run(script, []);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /--input/);
    assert.doesNotMatch(result.stdout, /Transaction sent/);
  }
});

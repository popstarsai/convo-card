# ConvoCard

**My conversation history is my business card.**

ConvoCard turns pasted AI conversation history and optional GitHub links into a structured business card, with a CLI path to register an ERC-8004 identity on **Arc Testnet**.

## Current status — v0.1

- **Web:** zero-build HTML/CSS/JavaScript. Paste history, review a local card preview, download JSON, and prepare a CLI handoff. It does not connect a wallet, upload to IPFS, or submit a transaction.
- **TypeScript core:** rule-based history processing, card generation with a Keccak-256 content hash, and a viem registrar.
- **CLI:** accepts your own input file, generates a final card, supports an offline registration dry run, and can submit a real testnet transaction when configured with a funded test wallet. Live submission requires RPC access; the automated checks do not mint an identity.

GitHub links are included as references; the app does not fetch repository activity. The extracted skills are keyword matches, not verified credentials.

## Project structure

| Path | Purpose |
| --- | --- |
| `src/types.ts` | `ConversationInput`, `AgentCard`, and registration types |
| `src/processHistory.ts` | Local cleanup, summary, topic and skill extraction |
| `src/generateCard.ts` | Final card, Keccak-256 hash and registration data URI |
| `src/registerAgent.ts` | Arc configuration, simulation, submission and receipt handling |
| `src/index.ts` | Library exports |
| `scripts/input.ts` | Validate the CLI input file |
| `scripts/generate.ts` | Generate a final card from that input |
| `scripts/register.ts` | Offline dry run or testnet registration |
| `web/index.html`, `web/style.css` | Responsive browser interface |
| `web/card-engine.js`, `web/app.js` | Local preview engine and UI controller |
| `web/README.md` | Frontend development notes |
| `examples/conversation-input.json` | Non-private example input |
| `tests/` | Browser/core parity, CLI handoff and registration checks |
| `.env.example`, `tsconfig.json` | CLI environment template and TypeScript build |

## Run the web version

From the repository root, with Python 3 installed:

```bash
python3 -m http.server 8080 -d web
```

Open [http://localhost:8080](http://localhost:8080). No npm install, bundler, API key or wallet is needed. Serve the **web folder only**, so local input files and `.env` are not exposed by the server. Use localhost or HTTPS for browser checksums and clipboard access.

1. Paste history (or load the sample), optionally add a name, bio and GitHub repository URLs, then select **Generate Card**.
2. Review the summary, extracted topics/skills and JSON preview.
3. Select **Prepare Arc Registration**, then **Download CLI Input**.
4. Move `conversation-input.json` into your local project folder and follow the CLI steps below.

Changing any input invalidates the preview and preparation, so exports cannot silently use an older card. Preparation is explicitly marked **Not submitted**.

## Run the CLI

Use Node.js 18.19+ (or a current Node.js LTS) and npm. From a fresh checkout:

```bash
git clone https://github.com/popstarsai/convo-card.git
cd convo-card
npm install
```

Generate a complete card from the included example, or substitute your downloaded input path:

```bash
npm run generate -- --input examples/conversation-input.json
npm run generate -- --input conversation-input.json
```

To save just the JSON, use `npm run --silent generate -- --input conversation-input.json > agent-card.json`.

Preview registration **offline**, without a private key or RPC request:

```bash
npm run register -- --input conversation-input.json --dry-run
```

The dry run prints the final card, target, function name and a real `data:application/json;base64,...` metadata URI. It does not simulate against the chain or validate current network availability. Review this output before publishing.

To submit an actual testnet transaction:

```bash
cp .env.example .env
# Edit .env with a dedicated test wallet's PRIVATE_KEY and the Arc Testnet settings.
npm run register -- --input conversation-input.json
```

Fund that wallet with testnet USDC using the [Circle faucet](https://faucet.circle.com). The registrar checks the RPC chain, simulates `register(agentURI)`, submits the transaction, checks the receipt status, and reads the Agent ID from that transaction's registry event. A failed or pending receipt is not reported as a confirmed registration; if a transaction hash is returned with an error, inspect it before retrying.

Both commands require `--input`; registration never silently substitutes sample data. See [ONBOARDING.md](ONBOARDING.md) for the guided flow.

## Data contract and metadata

Both entry points accept the same `ConversationInput` fields:

```json
{
  "name": "Alex Rivera",
  "bio": "Building useful tools with AI.",
  "rawHistory": "I am building AI agents with TypeScript.",
  "githubRepos": ["https://github.com/popstarsai/convo-card"]
}
```

`rawHistory` is required. The browser normalizes and deduplicates full HTTPS GitHub repository URLs. Both engines use the same cleanup, extraction, defaults and core card fields; parity tests guard the deliberately small duplicated adapter.

| Export | Meaning |
| --- | --- |
| `conversation-input.json` | Input for the CLI; includes the pasted history. Keep it private. |
| `agent-card-preview.json` | Local browser preview. Uses the core card fields but omits `contentHash`. |
| `registration-prep.json` | Local preparation, target, preview checksum and CLI commands. `submitted` is false and `metadataURI` is null until CLI finalization. |
| `agent-card.json` | Final TypeScript card, including the authoritative Keccak-256 `contentHash`. |

The browser's **SHA-256 preview checksum** covers the exact preview download, including its timestamp. It is distinct from the core's **Keccak-256 content hash**, which covers the sorted core fields and excludes `generatedAt` and `extra`. Timestamps are created separately in each runtime. The legacy `gemini-history` source label is retained for history without repository links; it does not detect the conversation provider.

The CLI wraps the final card in ERC-8004 registration metadata with the standard `type`, no advertised services, and `active: false`. It makes no pre-mint `agentId` or `registrations` claim. v0.1 stores this metadata in a data URI; no IPFS account is required. Registration publishes the card's name, bio, summary (which can contain transcript excerpts), topics, skills and repository links. The full `rawHistory` input is not copied into the registration metadata.

## Arc Testnet target

| Setting | Value |
| --- | --- |
| Chain ID | `5042002` (`0x4cef52`) |
| RPC | `https://rpc.testnet.arc.io` |
| Gas token | Testnet USDC |
| Identity Registry | `0x8004A818BFB912233c491871b3d84c89A494BD9e` |
| Explorer | [explorer.testnet.arc.io](https://explorer.testnet.arc.io) |

References: [ERC-8004 specification](https://eips.ethereum.org/EIPS/eip-8004), [registry deployments](https://github.com/erc-8004/erc-8004-contracts#arc-testnet), and [Circle's Arc network reference](https://github.com/circlefin/skills/blob/master/plugins/circle/skills/use-arc/SKILL.md).

## Development and next steps

```bash
npm test
npm run build
```

`npm run build` produces the TypeScript library in `dist/`; it does not build the frontend. `npm run dev` watches the library entry point, not an HTTP API server. `npm run lint` is still a placeholder.

`TODO(astra)` / `TODO(v0.2)` comments mark the next integration points: browser wallet connection and network checks, optional IPFS pinning via a server integration, explicit user signing and confirmed mint feedback, and shared browser/core modules. No wallet or pinning secrets belong in `/web`.

## License

[Apache-2.0](LICENSE).

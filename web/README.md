# ConvoCard web frontend

Zero-build HTML, CSS and JavaScript for v0.1. All preview processing stays in the browser; there are no external scripts, uploads, wallet calls or RPC calls.

From the repository root:

```bash
python3 -m http.server 8080 -d web
```

Open [http://localhost:8080](http://localhost:8080). HTTPS or localhost is needed for Web Crypto and clipboard features.

## Files

- `index.html` — input, preview and registration preparation panel.
- `style.css` — responsive studio styles.
- `card-engine.js` — `ConversationInput` adapter, core-aligned preview and explicit local preparation.
- `app.js` — UI state, errors, downloads and copy actions.

## Registration handoff

Generate and review a card, select **Prepare Arc Registration**, then download `conversation-input.json`. This file contains the pasted history and is intended for local CLI use. From the project root after `npm install`:

```bash
npm run generate -- --input conversation-input.json
npm run register -- --input conversation-input.json --dry-run
```

The dry run produces the final metadata without a wallet or network call. Actual registration requires a configured `.env`, a funded test wallet and running the same register command without `--dry-run`. See the [main README](../README.md) for setup.

`agent-card-preview.json` shares the TypeScript card's fields but omits the final Keccak-256 `contentHash`. The browser's SHA-256 checksum identifies the exact preview JSON only. `registration-prep.json` is a preparation record, not a transaction or IPFS upload; its `metadataURI` remains null until CLI finalization. The UI never claims an Agent ID before minting.

## v0.2 integration points

Search for `TODO(astra)` and `TODO(v0.2)` in the engine and controller:

1. Connect an EIP-1193 wallet and verify Arc Testnet/account changes before signing.
2. Optionally upload the finalized metadata through a server integration and use its real IPFS CID.
3. Simulate and submit `register(agentURI)` only on an explicit sign action; interpret the confirmed receipt as in `src/registerAgent.ts`.
4. Share the TypeScript core when a build becomes useful. Until then, `npm test` checks preview/core parity.

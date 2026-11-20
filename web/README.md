# ConvoCard Web Frontend (`/web`)

Zero-build, vanilla HTML/CSS/JS frontend for **ConvoCard v0.1** (*"My conversation history is my business card."*).

## Structure

- `index.html` — Two-column studio layout (OCR conversation input + live ERC-8004 AgentCard preview + Arc Testnet registration prep).
- `style.css` — Self-contained dark-mode styles and responsive grid.
- `card-engine.js` — Browser-compatible ES module mirroring `src/processHistory.ts`, `src/generateCard.ts`, and `src/registerAgent.ts`.
- `app.js` — DOM state and event controller.

## Running Locally

Because `app.js` uses native ES modules (`<script type="module">`), serve the `/web` folder over any local static HTTP server:

```bash
# Option 1: Python
python3 -m http.server 8080 -d web

# Option 2: Node
npx serve web -p 8080
```

Then open `http://localhost:8080` in your browser.

## Handoff Notes for v0.2 (ChatGPT Astra)

Search for `TODO(astra)` in `web/card-engine.js` for the clean extension points:
1. **Wallet Connection**: Connect MetaMask / Circle Passkey / WalletConnect to **Arc Testnet** (`Chain ID: 5042002`, `RPC: https://rpc.testnet.arc.io`, gas token: `USDC`).
2. **IPFS Pinning**: Upload `agentCard` JSON to IPFS (e.g., Pinata) to get a real `ipfs://<CID>` `tokenURI`.
3. **On-Chain Minting**: Submit `register(tokenURI)` to the deployed ERC-8004 `IdentityRegistry` contract.
4. **TypeScript Sharing**: Add a lightweight Vite/esbuild setup if you want to import `src/processHistory.ts` and `src/generateCard.ts` directly.

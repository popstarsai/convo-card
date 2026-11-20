# ConvoCard — v0.1 onboarding

You can generate and prepare a card without a wallet. Registration currently uses the CLI; browser wallet connection is planned for v0.2.

1. From the repository root, run `python3 -m http.server 8080 -d web` and open [localhost:8080](http://localhost:8080).
2. Paste your AI conversation history, optionally add your name, bio and GitHub links, then select **Generate Card**.
3. Review the summary and JSON. Select **Prepare Arc Registration**, then **Download CLI Input**. Keep this input file private: it includes the pasted history.
4. Move `conversation-input.json` into your local checkout. Install Node.js 18.19+ and run `npm install` there.
5. Run `npm run register -- --input conversation-input.json --dry-run`. This generates the final card and data URI offline. Review the metadata that will be published, including the summary's transcript excerpts.
6. To register, copy `.env.example` to `.env` and set a dedicated test wallet's `PRIVATE_KEY`. Leave the default Arc Testnet chain and registry settings unless you are deliberately testing a different registry.
7. Request testnet USDC for that wallet from the [Circle faucet](https://faucet.circle.com), selecting Arc Testnet.
8. Run `npm run register -- --input conversation-input.json`. This submits a real testnet transaction. A confirmed result includes the transaction hash, explorer URL, metadata URI, and Agent ID when decoded from the receipt.

Arc Testnet uses chain ID `5042002`, RPC `https://rpc.testnet.arc.io`, and Identity Registry `0x8004A818BFB912233c491871b3d84c89A494BD9e`. IPFS is not required for v0.1's data URI storage.

If a submitted transaction is followed by an error, check its explorer link before retrying. See the [main README](README.md) for file formats, development commands and current limitations.

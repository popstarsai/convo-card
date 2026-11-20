# ConvoCard

**My conversation history is my business card.**

ConvoCard turns a founder’s real AI conversation history (and optionally GitHub activity) into a living, verifiable, on-chain Agent identity using ERC-8004 on Arc.

The agent *is* the business card.

## Vision

Traditional LinkedIn profiles are outdated.  
Your actual work, thinking, and capability live in your AI conversations and code history.  
ConvoCard makes that history your permanent, scoped, authenticated presence on the blockchain.

## Current Status – v0.1

- Paste OCR’d AI conversation history (from Gemini / ChatGPT screenshots)
- Optionally add GitHub repositories
- Generate a structured Agent Card (JSON)
- Compute content hash
- Register as an ERC-8004 agent on **Arc Testnet**
- The resulting on-chain identity becomes your living business card

## Tech Stack

- TypeScript
- viem (Arc / EVM interaction)
- Simple web UI (to be expanded)
- ERC-8004 Identity Registry on Arc
- Arc Testnet (Chain ID: 5042002)

## Project Structure
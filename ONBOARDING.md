# ConvoCard – User Onboarding

**Goal:** Turn your AI conversation history into a living on-chain business card in under 10 minutes.

## Prerequisites

- A modern browser
- A wallet that can connect to Arc Testnet (MetaMask, Rabby, etc.)
- Some testnet USDC for gas (free from faucet)

## Step-by-step

### 1. Get testnet USDC
1. Go to [https://faucet.circle.com](https://faucet.circle.com)
2. Select **Arc Testnet**
3. Paste your wallet address
4. Request testnet USDC

### 2. Add Arc Testnet to your wallet
- Network Name: `Arc Testnet`
- RPC URL: `https://rpc.testnet.arc.io`
- Chain ID: `5042002`
- Currency Symbol: `USDC`
- Block Explorer: `https://explorer.testnet.arc.io`

### 3. Prepare your data
1. Open your Gemini or ChatGPT history
2. Take screenshots of the most relevant conversations
3. Use iPhone Picture-in-Picture + OCR (or any OCR tool) to extract the text
4. Copy the extracted text

### 4. Generate your Agent Card
1. Open the ConvoCard web app (or run locally)
2. Paste the conversation history
3. (Optional) Add GitHub repository links
4. Click **Generate Card**
5. Review the structured card

### 5. Register on Arc
1. Connect your wallet
2. Click **Register Agent**
3. Confirm the transaction
4. Your on-chain Agent ID is now your living business card

### 6. Share it
Once registered you will receive:
- Agent ID (ERC-721 token ID)
- Transaction hash
- Explorer link
- Metadata URI

You can now point anyone to your on-chain identity.

---

**Notes for later versions**
- Mobile-first OCR flow
- One-click update of the agent card
- Mainnet support
- Automatic GitHub activity ingestion

This file will be updated by Astra after the core registration flow is finished.
/**
 * registerAgent.ts
 * Registers an AgentCard as an ERC-8004 identity on Arc Testnet.
 */

import {
  createWalletClient,
  createPublicClient,
  http,
  parseAbiItem,
  type Hash,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import type { AgentCard, RegistrationResult, ArcConfig } from "./types.js";
import { cardToDataURI } from "./generateCard.js";

// Default Arc Testnet Identity Registry (ERC-8004)
// Confirm latest address in docs.arc.io if needed
const DEFAULT_IDENTITY_REGISTRY =
  "0x8004A818BFB912233c491871b3d84c89A494BD9e" as const;

const identityAbi = [
  {
    name: "register",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "agentURI", type: "string" }],
    outputs: [],
  },
] as const;

/**
 * Registers the AgentCard on Arc Testnet via ERC-8004 Identity Registry.
 */
export async function registerAgent(
  card: AgentCard,
  config: ArcConfig
): Promise<RegistrationResult> {
  try {
    if (!config.privateKey) {
      return {
        success: false,
        error: "PRIVATE_KEY is required to register an agent",
      };
    }

    const account = privateKeyToAccount(config.privateKey);
    const rpcUrl = config.rpcUrl || "https://rpc.testnet.arc.io";
    const identityRegistry =
      config.identityRegistry || DEFAULT_IDENTITY_REGISTRY;

    const publicClient = createPublicClient({
      transport: http(rpcUrl),
    });

    const walletClient = createWalletClient({
      account,
      transport: http(rpcUrl),
    });

    // Create metadata URI (data URI for v0.1 – later we can switch to IPFS)
    const metadataURI = cardToDataURI(card);

    console.log("Registering agent on Arc Testnet...");
    console.log("Wallet:", account.address);
    console.log("Registry:", identityRegistry);

    // Send the register transaction
    const txHash = await walletClient.writeContract({
      address: identityRegistry,
      abi: identityAbi,
      functionName: "register",
      args: [metadataURI],
      account,
      chain: null, // Arc Testnet is not in viem's default chains yet
    });

    console.log("Transaction sent:", txHash);

    // Wait for receipt
    const receipt = await publicClient.waitForTransactionReceipt({
      hash: txHash as Hash,
    });

    // Try to extract the agentId from Transfer event
    let agentId: string | undefined;

    const transferLogs = await publicClient.getLogs({
      address: identityRegistry,
      event: parseAbiItem(
        "event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)"
      ),
      args: {
        to: account.address,
      },
      fromBlock: receipt.blockNumber,
      toBlock: receipt.blockNumber,
    });

    if (transferLogs.length > 0) {
      const tokenId = transferLogs[transferLogs.length - 1].args.tokenId;
      if (tokenId !== undefined) {
        agentId = tokenId.toString();
      }
    }

    const explorerUrl = `https://explorer.testnet.arc.io/tx/${txHash}`;

    return {
      success: true,
      agentId,
      txHash: txHash as `0x${string}`,
      metadataURI,
      explorerUrl,
    };
  } catch (err: any) {
    console.error("Registration failed:", err);
    return {
      success: false,
      error: err?.message || "Unknown error during registration",
    };
  }
}
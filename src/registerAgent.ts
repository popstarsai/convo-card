/** Registers a finalized AgentCard on Arc Testnet. Browser preparation is separate. */
import {
  createWalletClient, createPublicClient, http,
  isAddress, zeroAddress, parseAbi, parseEventLogs,
  type Address, type Chain, type TransactionReceipt,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import type { AgentCard, RegistrationResult, ArcConfig } from "./types.js";
import { cardToDataURI } from "./generateCard.js";

// Keep web/card-engine.js aligned; covered by the cross-runtime tests.
export const DEFAULT_IDENTITY_REGISTRY =
  "0x8004A818BFB912233c491871b3d84c89A494BD9e" as const;
export const ARC_TESTNET = {
  id: 5042002,
  name: "Arc Testnet",
  nativeCurrency: { name: "USDC", symbol: "USDC", decimals: 18 },
  rpcUrls: { default: { http: ["https://rpc.testnet.arc.io"] } },
  blockExplorers: { default: { name: "Arc Explorer", url: "https://explorer.testnet.arc.io" } },
  testnet: true,
} as const satisfies Chain;

const identityAbi = parseAbi([
  "function register(string agentURI) returns (uint256 agentId)",
  "event Registered(uint256 indexed agentId, string agentURI, address indexed owner)",
]);

/** Shared receipt interpretation for the CLI and a future browser wallet adapter. */
export function readRegistrationReceipt(
  receipt: Pick<TransactionReceipt, "status" | "logs" | "transactionHash">,
  identityRegistry: Address,
  owner: Address,
  metadataURI: string
): RegistrationResult {
  const txHash = receipt.transactionHash;
  const result = {
    txHash, metadataURI,
    explorerUrl: `${ARC_TESTNET.blockExplorers.default.url}/tx/${txHash}`,
  };
  if (receipt.status !== "success") {
    return { ...result, success: false, error: "Registration transaction reverted." };
  }
  // Only this receipt and registry can establish the ID; another mint in the
  // same block must never be reported as this user's registration.
  const logs = parseEventLogs({
    abi: identityAbi, eventName: "Registered",
    logs: receipt.logs.filter((log) => log.address.toLowerCase() === identityRegistry.toLowerCase()),
  });
  const registration = logs.find((log) => log.args.owner.toLowerCase() === owner.toLowerCase()
    && log.args.agentURI === metadataURI);
  if (!registration) {
    return { ...result, success: false,
      error: "Transaction confirmed but no matching Registered event was found. Inspect it before retrying." };
  }
  return { ...result, success: true, agentId: registration.args.agentId.toString() };
}

export async function registerAgent(card: AgentCard, config: ArcConfig): Promise<RegistrationResult> {
  let txHash: `0x${string}` | undefined;
  try {
    if (config.chainId !== ARC_TESTNET.id) throw new Error("v0.1 registration supports Arc Testnet (5042002) only.");
    const identityRegistry = config.identityRegistry || DEFAULT_IDENTITY_REGISTRY;
    if (!isAddress(identityRegistry) || identityRegistry.toLowerCase() === zeroAddress) {
      throw new Error("A valid, non-zero Identity Registry address is required.");
    }
    if (!config.privateKey || !/^0x[0-9a-fA-F]{64}$/.test(config.privateKey)) {
      throw new Error("Set PRIVATE_KEY in your local .env to a dedicated test wallet key.");
    }
    const account = privateKeyToAccount(config.privateKey);
    const transport = http(config.rpcUrl || ARC_TESTNET.rpcUrls.default.http[0]);
    const publicClient = createPublicClient({ chain: ARC_TESTNET, transport });
    const walletClient = createWalletClient({ account, chain: ARC_TESTNET, transport });
    if (await publicClient.getChainId() !== ARC_TESTNET.id) {
      throw new Error("RPC chain does not match Arc Testnet (5042002). No transaction sent.");
    }

    // TODO(v0.2): Pin this same finalized registration JSON to IPFS via a server
    // integration and replace the data URI only after a real CID is returned.
    const metadataURI = cardToDataURI(card);
    const { request } = await publicClient.simulateContract({
      address: identityRegistry, abi: identityAbi, functionName: "register",
      args: [metadataURI], account,
    });
    txHash = await walletClient.writeContract(request);
    console.log("Transaction sent:", txHash);
    const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
    return readRegistrationReceipt(receipt, identityRegistry, account.address, metadataURI);
  } catch (error) {
    return {
      success: false,
      ...(txHash ? { txHash, explorerUrl: `${ARC_TESTNET.blockExplorers.default.url}/tx/${txHash}` } : {}),
      error: error instanceof Error ? error.message : "Unknown error during registration",
    };
  }
}

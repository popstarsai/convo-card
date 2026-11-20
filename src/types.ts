/**
 * Core types for ConvoCard
 * "My conversation history is my business card"
 */

export interface ConversationInput {
  /** Raw text pasted from OCR of AI chat history (Gemini, ChatGPT, etc.) */
  rawHistory: string;
  /** Optional list of GitHub repositories or activity */
  githubRepos?: string[];
  /** Optional display name */
  name?: string;
  /** Optional short bio override */
  bio?: string;
}

export interface AgentCard {
  /** Name of the agent / founder */
  name: string;
  /** Short description — this is the living business card */
  description: string;
  /** Optional image URL or IPFS */
  image?: string;
  /** Cleaned summary of the conversation history */
  historySummary: string;
  /** Extracted key topics / themes */
  keyTopics: string[];
  /** Extracted skills / technologies */
  skills: string[];
  /** Linked GitHub repositories or activity */
  github: string[];
  /** keccak256 hash of the card content (for integrity) */
  contentHash: `0x${string}`;
  /** Source of the data */
  source: "gemini-history" | "chatgpt-history" | "mixed" | "github-only";
  /** Version of the card schema */
  version: "0.1";
  /** Timestamp when the card was generated */
  generatedAt: string;
  /** Optional extra metadata */
  extra?: Record<string, unknown>;
}

export interface RegistrationResult {
  success: boolean;
  agentId?: string;
  txHash?: `0x${string}`;
  metadataURI?: string;
  explorerUrl?: string;
  error?: string;
}

export interface ArcConfig {
  rpcUrl: string;
  chainId: number;
  identityRegistry: `0x${string}`;
  privateKey?: `0x${string}`;
}
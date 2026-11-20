/**
 * processHistory.ts
 * Cleans raw OCR'd conversation history and extracts basic structure.
 * v0.1 – rule-based / lightweight (Astra can later upgrade to LLM extraction)
 */

import type { ConversationInput } from "./types.js";

export interface ProcessedHistory {
  cleanedText: string;
  historySummary: string;
  keyTopics: string[];
  skills: string[];
}

/**
 * Very lightweight cleaning + extraction for v0.1.
 * Later versions can call Gemini / Claude for better extraction.
 */
export function processHistory(input: ConversationInput): ProcessedHistory {
  const raw = input.rawHistory || "";

  // Basic cleaning
  let cleaned = raw
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();

  // Create a short summary (first ~400 chars + ellipsis)
  const historySummary =
    cleaned.length > 420
      ? cleaned.slice(0, 400).trim() + "..."
      : cleaned;

  // Extremely simple keyword extraction (v0.1)
  const lower = cleaned.toLowerCase();

  const possibleTopics = [
    "ai agents", "agentic", "blockchain", "solidity", "rust", "typescript",
    "react", "next.js", "smart contracts", "defi", "stablecoins", "usdc",
    "arc", "flare", "ethereum", "machine learning", "llm", "gemini",
    "chatgpt", "rag", "orchestration", "microservices", "api", "security",
    "ownership", "identity", "reputation", "erc-8004", "github"
  ];

  const keyTopics = possibleTopics.filter((topic) => lower.includes(topic));

  const possibleSkills = [
    "typescript", "javascript", "python", "rust", "solidity", "go",
    "react", "next.js", "node.js", "viem", "ethers", "hardhat", "foundry",
    "docker", "kubernetes", "aws", "gcp", "ai engineering", "prompt engineering",
    "system design", "smart contract development", "agent development"
  ];

  const skills = possibleSkills.filter((skill) => lower.includes(skill));

  // Deduplicate and limit
  const uniqueTopics = [...new Set(keyTopics)].slice(0, 12);
  const uniqueSkills = [...new Set(skills)].slice(0, 15);

  return {
    cleanedText: cleaned,
    historySummary,
    keyTopics: uniqueTopics,
    skills: uniqueSkills,
  };
}
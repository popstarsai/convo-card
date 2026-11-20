/**
 * src/index.ts
 * Main entry point for ConvoCard library.
 */

export type {
  ConversationInput,
  AgentCard,
  RegistrationResult,
  ArcConfig,
} from "./types.js";

export { processHistory } from "./processHistory.js";
export { generateCard, cardToDataURI, printCard } from "./generateCard.js";
export { registerAgent } from "./registerAgent.js";

console.log("ConvoCard library loaded – My conversation history is my business card.");
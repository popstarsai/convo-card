/** Read the same ConversationInput exported by the zero-build browser. */
import { readFile } from "node:fs/promises";
import type { ConversationInput } from "../src/types.js";

export async function readConversationInput(path: string | undefined): Promise<ConversationInput> {
  if (!path) throw new Error("Provide --input <file.json>; try examples/conversation-input.json.");
  const input: unknown = JSON.parse(await readFile(path, "utf8"));
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("Input must be a ConversationInput JSON object.");
  }
  const value = input as Record<string, unknown>;
  if (typeof value.rawHistory !== "string" || !value.rawHistory.trim()) {
    throw new Error("Input requires a non-empty rawHistory string; use Download CLI Input, not the preview or preparation file.");
  }
  for (const field of ["name", "bio"] as const) {
    if (value[field] !== undefined && typeof value[field] !== "string") {
      throw new Error(`${field} must be a string.`);
    }
  }
  if (value.githubRepos !== undefined && (!Array.isArray(value.githubRepos)
    || !value.githubRepos.every((url) => typeof url === "string"))) {
    throw new Error("githubRepos must be an array of strings.");
  }
  // Select only the public input contract; do not carry unrelated imported keys forward.
  return { rawHistory: value.rawHistory, name: value.name as string | undefined,
    bio: value.bio as string | undefined, githubRepos: value.githubRepos as string[] | undefined };
}

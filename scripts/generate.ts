import { parseArgs } from "node:util";
import { generateCard } from "../src/generateCard.js";
import { readConversationInput } from "./input.js";

try {
  const { values } = parseArgs({ options: { input: { type: "string" } }, allowPositionals: false });
  const input = await readConversationInput(values.input);
  console.log(JSON.stringify(generateCard(input), null, 2));
} catch (error) {
  console.error(error instanceof Error ? error.message : "Could not generate the card.");
  process.exitCode = 1;
}

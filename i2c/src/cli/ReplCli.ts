// npm run start (i2c.sh): type prompts and see the command i2c produces from the trained model. Runs nothing.
import fs from "fs/promises";
import path from "path";
import * as readline from "readline/promises";
import { I2cService } from "../services/I2cService";

const EXIT_WORDS = ["bye", "exit", "q", "salir"];
const MODEL_PATH = path.join(process.cwd(), "model", "i2c-model.json");

const print = (line: string): void => {
  process.stdout.write(`${line}\n`);
};

async function main(): Promise<void> {
  const i2c = I2cService.fromModel(await fs.readFile(MODEL_PATH, "utf-8"));
  print(`# I2C ready (${MODEL_PATH}). Type a prompt or ${EXIT_WORDS.join(", ")} to quit. #`);

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  while (true) {
    const input = (await rl.question("> ")).trim();
    if (!input) continue;
    if (EXIT_WORDS.includes(input.toLowerCase())) break;

    const result = await i2c.toCommand(input);
    print(`Locale:  ${result.locale}`);
    print(`Intent:  ${result.intent} (score ${result.score.toFixed(2)})`);
    print(`Command: ${result.command ?? "None (goes to the LLM)"}`);
  }
  rl.close();
  print("I2C finished...");
}

main().catch((error: Error) => {
  process.stderr.write(`I2C failed: ${error.message}\n`);
  process.exit(1);
});

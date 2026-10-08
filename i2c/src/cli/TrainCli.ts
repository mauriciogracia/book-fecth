// npm run train (train.sh): builds the corpus, measures accuracy on held-out utterances and, when it is good enough,
// writes the model vsce ships (model/i2c-model.json). Exit code 1 leaves the previous model untouched.
import fs from "fs/promises";
import path from "path";
import { CorpusBuilder } from "../services/CorpusBuilder";
import { I2cTrainer } from "../services/I2cTrainer";

const MIN_ACCURACY = 0.85;
const MODEL_PATH = path.join(process.cwd(), "model", "i2c-model.json");

const print = (line: string): void => {
  process.stdout.write(`${line}\n`);
};

async function main(): Promise<void> {
  const corpus = await new CorpusBuilder().build();
  if (!corpus.success) throw new Error(`Corpus build failed: ${corpus.message}`);
  print(corpus.message);

  const trainer = new I2cTrainer();
  const evaluation = await trainer.evaluate(corpus.data);
  for (const miss of evaluation.misses) {
    print(`  miss [${miss.locale}] "${miss.utterance}": expected ${miss.expected}, got ${miss.got}`);
  }
  const accuracy = (evaluation.accuracy * 100).toFixed(1);
  print(`Held-out accuracy: ${accuracy}% (${evaluation.correct}/${evaluation.total}), minimum ${MIN_ACCURACY * 100}%`);
  if (evaluation.accuracy < MIN_ACCURACY) {
    throw new Error("Accuracy below the minimum: model not written");
  }

  const model = await trainer.train(corpus.data);
  await fs.mkdir(path.dirname(MODEL_PATH), { recursive: true });
  await fs.writeFile(MODEL_PATH, model, "utf-8");
  print(`Model written: ${MODEL_PATH} (${Math.round(model.length / 1024)} KB)`);
}

main().catch((error: Error) => {
  process.stderr.write(`i2c training failed: ${error.message}\n`);
  process.exit(1);
});

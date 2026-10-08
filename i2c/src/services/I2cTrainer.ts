import { Nlp } from "@nlpjs/nlp";
import { CorpusInterface } from "../interfaces/CorpusInterface";
import { I2cEvaluationInterface } from "../interfaces/I2cEvaluationInterface";
import { I2cMissInterface } from "../interfaces/I2cMissInterface";
import { I2cService } from "./I2cService";
import { NlpFactory } from "./NlpFactory";
import { NlpjsEntityRules } from "./NlpjsEntityRules";
import { QuotedValueMask } from "./QuotedValueMask";

/**
 * I2cTrainer - Trains the i2c model from the corpora (CorpusBuilder) and measures it on held-out utterances.
 * The split is deterministic: every HOLDOUT_EVERY-th utterance of each intent is held out.
 */
export class I2cTrainer {
  public static readonly HOLDOUT_EVERY = 5;

  /** The exported model (JSON text) trained on every utterance. */
  public async train(corpora: CorpusInterface[]): Promise<string> {
    const nlp = NlpFactory.create();
    I2cTrainer.addCorpora(nlp, corpora);
    NlpjsEntityRules.register(nlp);
    await nlp.train();
    return nlp.export(true);
  }

  /** Trains without the held-out utterances, then asks I2cService (export + import, as at runtime) for each of them. */
  public async evaluate(corpora: CorpusInterface[]): Promise<I2cEvaluationInterface> {
    const i2c = I2cService.fromModel(await this.train(I2cTrainer.split(corpora, false)));
    const misses: I2cMissInterface[] = [];
    let total = 0;
    for (const corpus of I2cTrainer.split(corpora, true)) {
      for (const { intent, utterances } of corpus.data) {
        for (const utterance of utterances) {
          total++;
          const result = await i2c.toCommand(utterance, corpus.locale);
          // Measures recognition, not commands: an intent may still have no command template (a pending command)
          const recognized = result.intent === intent && result.score >= I2cService.MIN_SCORE;
          const right = intent === I2cService.NONE_INTENT ? result.command === null : recognized;
          if (!right) {
            const got = result.command === null ? `not understood (${result.intent} ${result.score.toFixed(2)})` : result.intent;
            misses.push({ locale: corpus.locale, utterance, expected: intent, got });
          }
        }
      }
    }
    const correct = total - misses.length;
    return { total, correct, accuracy: total ? correct / total : 0, misses };
  }

  private static addCorpora(nlp: Nlp, corpora: CorpusInterface[]): void {
    for (const corpus of corpora) {
      for (const { intent, utterances, answers } of corpus.data) {
        for (const utterance of utterances) nlp.addDocument(corpus.locale, QuotedValueMask.apply(utterance), intent);
        for (const answer of answers) nlp.addAnswer(corpus.locale, intent, answer);
      }
    }
  }

  /** heldOut: only the held-out utterances; otherwise every other one. */
  private static split(corpora: CorpusInterface[], heldOut: boolean): CorpusInterface[] {
    const isHeldOut = (index: number) => index % I2cTrainer.HOLDOUT_EVERY === I2cTrainer.HOLDOUT_EVERY - 1;
    return corpora.map((corpus) => ({
      ...corpus,
      data: corpus.data.map((entry) => ({
        ...entry,
        utterances: entry.utterances.filter((_, index) => isHeldOut(index) === heldOut),
      })),
    }));
  }
}

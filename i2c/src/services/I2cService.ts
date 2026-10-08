import { Nlp } from "@nlpjs/nlp";
import { EntityExtractorInterface } from "../interfaces/EntityExtractorInterface";
import { I2cResultInterface } from "../interfaces/I2cResultInterface";
import { CommandTemplate } from "./CommandTemplate";
import { NlpFactory } from "./NlpFactory";
import { NlpjsEntityExtractor } from "./NlpjsEntityExtractor";
import { QuotedValueMask } from "./QuotedValueMask";

/**
 * I2cService - Turns a prompt into the iNoU `/command` it asks for, from a pre-trained model (TrainCli writes it).
 * Pure: no file access, no training, no output; the caller loads the model and routes the command.
 */
export class I2cService {
  /** Below this score a prompt counts as not understood. */
  public static readonly MIN_SCORE = 0.4;
  /** The label of prompts that are no iNoU command (nlp.js's own "not understood" intent); it has no command. */
  public static readonly NONE_INTENT = "None";

  private constructor(
    private readonly nlp: Nlp,
    private readonly entities: EntityExtractorInterface,
  ) {}

  /** model: the exported model's JSON text (i2c/model/i2c-model.json). */
  public static fromModel(model: string): I2cService {
    const nlp = NlpFactory.create();
    nlp.import(model);
    return new I2cService(nlp, new NlpjsEntityExtractor(nlp));
  }

  /** lang: "en" / "es" when the caller knows it; guessed otherwise (unreliable on very short prompts). */
  public async toCommand(prompt: string, lang?: string): Promise<I2cResultInterface> {
    const entities = await this.entities.extract(prompt, lang);
    const response = await this.nlp.process(lang, QuotedValueMask.apply(prompt));
    const understood = response.intent !== I2cService.NONE_INTENT && response.score >= I2cService.MIN_SCORE;
    // The answer is the intent's command template; the prompt's values fill it
    const command = understood && response.answer ? CommandTemplate.fill(response.answer, entities) : null;
    return {
      command,
      intent: response.intent,
      score: response.score,
      locale: response.locale,
    };
  }
}

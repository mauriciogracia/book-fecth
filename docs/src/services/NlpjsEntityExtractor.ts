import { Nlp } from "@nlpjs/nlp";
import { I2cEntityName } from "../enums/I2cEntityName";
import { EntityExtractorInterface } from "../interfaces/EntityExtractorInterface";
import { I2cEntityInterface } from "../interfaces/I2cEntityInterface";

/**
 * Entities from the nlp.js rules (NlpjsEntityRules, inside the model). Overlaps are resolved: the longer span wins
 * (a "quoted text with a/path inside" stays one value); on the same span, the order of PRIORITY.
 */
export class NlpjsEntityExtractor implements EntityExtractorInterface {
  private static readonly PRIORITY: ReadonlyArray<string> = [
    I2cEntityName.TARGET,
    I2cEntityName.SYMBOL,
    I2cEntityName.LINES,
    I2cEntityName.LOCATION,
    I2cEntityName.QUOTED,
    I2cEntityName.PATH,
    I2cEntityName.NAME,
  ];

  constructor(private readonly nlp: Nlp) {}

  public async extract(prompt: string, locale?: string): Promise<I2cEntityInterface[]> {
    const found = (await this.nlp.extractEntities(locale, prompt)).entities
      .filter((e) => NlpjsEntityExtractor.PRIORITY.includes(e.entity))
      .map((e) => ({ entity: e.entity as I2cEntityName, text: e.sourceText, start: e.start, end: e.end }))
      .sort((a, b) => b.end - b.start - (a.end - a.start) || NlpjsEntityExtractor.rank(a) - NlpjsEntityExtractor.rank(b));

    const kept: I2cEntityInterface[] = [];
    for (const entity of found) {
      if (!kept.some((k) => entity.start <= k.end && k.start <= entity.end)) kept.push(entity);
    }
    return kept.sort((a, b) => a.start - b.start);
  }

  private static rank(entity: I2cEntityInterface): number {
    return NlpjsEntityExtractor.PRIORITY.indexOf(entity.entity);
  }
}

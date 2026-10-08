import { containerBootstrap } from "@nlpjs/core";
import { Nlp } from "@nlpjs/nlp";
import { LangEn } from "@nlpjs/lang-en";
import { LangEs } from "@nlpjs/lang-es";

/** The single way i2c builds an nlp.js engine (training and runtime): en + es, in memory, no file access. */
export class NlpFactory {
  public static readonly LANGUAGES: ReadonlyArray<string> = ["en", "es"];
  /**
   * nlp.js's own NLU defaults (@nlpjs/nlu Nlu.registerDefault) with the per-epoch console log off. Registered first,
   * so nlp.js keeps it (it never overwrites an existing configuration); every value must stay, they are not merged.
   */
  private static readonly NLU_SETTINGS = {
    keepStopwords: true,
    nonefeatureValue: 1,
    nonedeltaMultiplier: 1.2,
    spellCheck: false,
    spellCheckDistance: 1,
    filterZeros: true,
    log: false,
  };

  public static create(): Nlp {
    const container = containerBootstrap();
    container.registerConfiguration("nlu-??", NlpFactory.NLU_SETTINGS, false);
    container.use(LangEn);
    container.use(LangEs);
    return new Nlp({ languages: [...NlpFactory.LANGUAGES], autoLoad: false, autoSave: false }, container);
  }
}

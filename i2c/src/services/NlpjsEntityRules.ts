import { Nlp } from "@nlpjs/nlp";
import { I2cEntityName } from "../enums/I2cEntityName";

/** Words of each language that announce a value; the article / filler words a value never is. */
interface LocaleKeywordsInterface {
  name: string;
  symbol: string;
  lines: string;
  target: string;
  location: string;
  filler: string;
}

/**
 * The nlp.js regex rules behind NlpjsEntityExtractor, registered at training time so the exported model carries them.
 * Quoted text may be any value (a path with spaces, the file content): which role it plays is decided later
 * (CommandTemplate), from its position.
 */
export class NlpjsEntityRules {
  public static readonly QUOTED = /```[\s\S]*?```|(?<=^|[\s(:])(?:"[^"]*"|'[^']*'|`[^`]*`)(?=$|[\s.,;:!?)])/g;
  private static readonly PATH = /(?:[\w.-]+\/)+[\w.-]*|\b[\w-]+\.[A-Za-z0-9]{1,8}\b/g;
  private static readonly VALUE = `(?:"[^"]*"|'[^']*'|\`[^\`]*\`|[\\w./-]+)`;

  private static readonly KEYWORDS: Readonly<Record<string, LocaleKeywordsInterface>> = {
    en: {
      name: "file|folder|directory|dir|called|named",
      symbol: "method|function|class|property|interface|enum",
      lines: "lines?",
      target: "to|into",
      location: "in|inside",
      filler: "the|a|an|folder|directory|file|method|function|class|property|interface|enum",
    },
    es: {
      name: "archivo|fichero|carpeta|directorio|llamad[oa]|nombre",
      symbol: "m[ée]todo|funci[óo]n|clase|propiedad|interfaz|enum",
      lines: "l[íi]neas?",
      target: "a|hacia|como",
      location: "en|dentro de",
      filler: "la|el|los|las|un|una|carpeta|directorio|archivo|m[ée]todo|funci[óo]n|clase|propiedad|interfaz|enum",
    },
  };

  public static register(nlp: Nlp): void {
    for (const [locale, words] of Object.entries(NlpjsEntityRules.KEYWORDS)) {
      nlp.addNerRegexRule(locale, I2cEntityName.QUOTED, NlpjsEntityRules.QUOTED);
      nlp.addNerRegexRule(locale, I2cEntityName.PATH, NlpjsEntityRules.PATH);
      nlp.addNerRegexRule(locale, I2cEntityName.NAME, NlpjsEntityRules.after(words.name, words, "[\\w.-]+"));
      nlp.addNerRegexRule(locale, I2cEntityName.SYMBOL, NlpjsEntityRules.after(words.symbol, words, "[A-Za-z_$][\\w$]*"));
      nlp.addNerRegexRule(locale, I2cEntityName.LINES, NlpjsEntityRules.after(words.lines, words, "\\d+(?:\\s*(?:-|to|a|al)\\s*\\d+)?"));
      nlp.addNerRegexRule(locale, I2cEntityName.TARGET, NlpjsEntityRules.after(words.target, words, NlpjsEntityRules.VALUE));
      nlp.addNerRegexRule(locale, I2cEntityName.LOCATION, NlpjsEntityRules.after(words.location, words, NlpjsEntityRules.VALUE));
    }
  }

  /** `value` right after one of `keywords` (and optional filler words), never a filler or keyword itself. */
  private static after(keywords: string, words: LocaleKeywordsInterface, value: string): RegExp {
    const skip = `(?:(?:${words.filler})\\s+)*`;
    const notAWord = `(?!(?:${words.filler}|${words.name}|${words.symbol}|${words.target}|${words.location}|with|con|of|de)\\b)`;
    return new RegExp(`(?<=\\b(?:${keywords})\\s+${skip})${notAWord}${value}`, "gi");
  }
}

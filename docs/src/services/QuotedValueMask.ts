import { NlpjsEntityRules } from "./NlpjsEntityRules";

/**
 * What the intent classifier reads: every quoted value (a path, text, code) becomes one marker word, the same at
 * training and at runtime. The classifier learns the sentence shape ("replace ‹v› with ‹v› in x.ts"), never the
 * words inside quotes (code would look like intents).
 */
export class QuotedValueMask {
  public static readonly MARKER = "qvalue";

  public static apply(text: string): string {
    return text.replace(new RegExp(NlpjsEntityRules.QUOTED.source, "g"), QuotedValueMask.MARKER);
  }
}

import { I2cEntityInterface } from "./I2cEntityInterface";

/** Finds the values of a prompt (paths, names, destinations, quoted text); swappable (nlp.js rules today). */
export interface EntityExtractorInterface {
  /** Non-overlapping, in prompt order. locale: "en" / "es", or undefined to guess it. */
  extract(prompt: string, locale?: string): Promise<I2cEntityInterface[]>;
}

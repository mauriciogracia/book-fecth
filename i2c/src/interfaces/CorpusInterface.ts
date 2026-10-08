import { CorpusIntentInterface } from "./CorpusIntentInterface";

/** The training corpus of one language. */
export interface CorpusInterface {
  name: string;
  locale: string;
  data: CorpusIntentInterface[];
}

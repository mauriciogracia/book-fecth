/** One intent of a corpus: its example utterances and the command it maps to. */
export interface CorpusIntentInterface {
  intent: string;
  utterances: string[];
  answers: string[];
}

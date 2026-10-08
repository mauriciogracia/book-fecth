/** A held-out utterance the model got wrong. */
export interface I2cMissInterface {
  locale: string;
  utterance: string;
  expected: string;
  got: string;
}

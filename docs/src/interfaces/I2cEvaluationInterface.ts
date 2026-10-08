import { I2cMissInterface } from "./I2cMissInterface";

/** Accuracy of a model trained without its held-out utterances, measured on them. */
export interface I2cEvaluationInterface {
  total: number;
  correct: number;
  accuracy: number;
  misses: I2cMissInterface[];
}

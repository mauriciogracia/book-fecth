import { I2cEntityName } from "../enums/I2cEntityName";

/** A value found in the prompt; `text` keeps its quotes, `start` / `end` are offsets in the prompt (end inclusive). */
export interface I2cEntityInterface {
  entity: I2cEntityName;
  text: string;
  start: number;
  end: number;
}

/** What i2c understood from a prompt. It never runs anything: the caller routes `command`. */
export interface I2cResultInterface {
  /** The iNoU `/command` the prompt asks for, or null when not understood. */
  command: string | null;
  intent: string;
  score: number;
  locale: string;
}

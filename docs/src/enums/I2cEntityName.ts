/** The values i2c pulls out of a prompt to fill a command template. */
export enum I2cEntityName {
  /** A path-like token: has a `/` or a file extension (src/a.txt, index.ts). */
  PATH = "path",
  /** A bare name right after "file" / "folder" / "called"... (move folder utils ...). */
  NAME = "name",
  /** The value after "to" / "into" / "a" / "hacia" (rename / move destination). */
  TARGET = "target",
  /** The value after "in" / "inside" / "en" / "dentro de": a destination only when there is no TARGET. */
  LOCATION = "location",
  /** A code symbol right after "method" / "function" / "class" / "método"... (rename the method greet). */
  SYMBOL = "symbol",
  /** A line range after "line(s)" / "línea(s)": 10-20, 10 to 20, 7. */
  LINES = "lines",
  /** "double", 'single' or `back` quoted text, or a ``` block: a quoted path or the file content. */
  QUOTED = "quoted",
}

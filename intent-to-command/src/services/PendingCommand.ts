import { CommandTemplate } from "./CommandTemplate";

/**
 * A command i2c understood but the prompt did not say everything for: its missing values are still placeholders
 * (`/file replace src/a.ts {old} {new}`). The caller asks for them one by one and supplies each answer.
 */
export class PendingCommand {
  /** The first value still missing (`old`, `target|name`...), or undefined when the command is complete. */
  public static next(command: string): string | undefined {
    const match = new RegExp(CommandTemplate.PLACEHOLDER.source).exec(command);
    return match ? `${match[1]}${match[2] ?? ""}` : undefined;
  }

  /** The command with its first missing value replaced by `answer` (quoted as one argument when needed). */
  public static supply(command: string, answer: string): string {
    return command.replace(new RegExp(CommandTemplate.PLACEHOLDER.source), (_, role: string, asName?: string) =>
      CommandTemplate.argument(role, answer.trim(), Boolean(asName))
    );
  }
}

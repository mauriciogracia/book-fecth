import { INTERNAL_COMMANDS } from "@inou/core-shared/config/InternalCommands";
import { InternalCommandCatalog } from "@inou/core-shared/config/InternalCommandCatalog";
import { InternalCommandInterface } from "@inou/core-shared/interfaces/InternalCommandInterface";
import { CorpusIntentInterface } from "../interfaces/CorpusIntentInterface";

/**
 * InternalCommandCorpus - Trains i2c on iNoU's own internal commands (INTERNAL_COMMANDS, the single definition).
 * - An intent named after an InouCommandId maps to that command: no prompt-mapping.csv row needed.
 * - Every runnable command is also trained on its spellings ("trello", "github status"); the phrasings live in
 *   corpus-data/prompt-samples/<lang>-internal-commands.csv (the i18n descriptions are too long: they hurt accuracy).
 * Runnable: no required argument (`<...>` in its usage); /chat <message>, /code <task> keep the user's words.
 */
export class InternalCommandCorpus {
  private static readonly RUNNABLE: ReadonlyArray<InternalCommandInterface> = Object.values(INTERNAL_COMMANDS).filter(
    (entry) => !entry.usage.includes("<"),
  );

  /** The command of an intent named after a runnable internal command; undefined for any other intent. */
  public static commandOf(intent: string): string | undefined {
    return InternalCommandCorpus.RUNNABLE.find((entry) => entry.id === intent)?.cmd;
  }

  /** False when the command's root is no internal command (vsce drops what it cannot run). */
  public static isInternal(command: string): boolean {
    return InternalCommandCatalog.isInternal(command);
  }

  /** One intent per runnable internal command (its spellings are language-neutral). */
  public static intents(): CorpusIntentInterface[] {
    return InternalCommandCorpus.RUNNABLE.map((entry) => ({
      intent: entry.id,
      utterances: InternalCommandCorpus.spellingWords(entry),
      answers: [entry.cmd],
    }));
  }

  /** `/github status` -> "github status", `/trello ?` -> "trello"; `/?` has no words. */
  private static spellingWords(entry: InternalCommandInterface): string[] {
    return [entry.cmd, ...(entry.aliases ?? [])]
      .map((spelling) => spelling.replace(/[^\p{L}\s]/gu, " ").replace(/\s+/g, " ").trim())
      .filter(Boolean);
  }
}

import { CorpusIntentInterface } from "../interfaces/CorpusIntentInterface";
import { BookApiCommand, parseBookApiCommand } from "../models/BookApiCommand";

/**
 * BookApiActionCorpus - Trains i2c on the Open Library book commands (BookApiAction enum, the single definition).
 * - An intent named after a BookCommand key maps to that command: no prompt-mapping.csv row needed.
 * - Every command is also trained on its spellings ("book fetch", "book author works"); the phrasings live in
 *   corpus-data/prompt-samples/<lang>-books.csv.
 * All are GET against https://openlibrary.org and need a value (query or OL id) extracted from the prompt.
 */
export class BookApiActionCorpus {
  private static readonly ENDPOINTS: Readonly<Record<BookApiCommand, string>> =
    {
      [BookApiCommand.BOOK_FETCH]: "/search.json",
      [BookApiCommand.BOOK_WORK]: "/works/{work_id}.json",
      [BookApiCommand.BOOK_AUTHOR]: "/authors/{author_id}.json",
      [BookApiCommand.BOOK_AUTHOR_WORKS]: "/authors/{author_id}/works.json",
    };

  private static readonly COMMANDS: ReadonlyArray<BookApiCommand> =
    Object.values(BookApiCommand).filter(
      (value): value is BookApiCommand => typeof value === "number",
    );

  /** The BookCommand of an intent named after one; undefined for any other intent. */
  public static commandOf(intent: string): BookApiCommand | undefined {
    try {
      return parseBookApiCommand(intent);
    } catch {
      return undefined;
    }
  }

  /** True when the intent is a book command. */
  public static isBook(intent: string): boolean {
    return BookApiActionCorpus.commandOf(intent) !== undefined;
  }

  /** The endpoint template of a command (`/works/{work_id}.json`). */
  public static endpointOf(command: BookApiCommand): string {
    return BookApiActionCorpus.ENDPOINTS[command];
  }

  /** One intent per book command (its spellings are language-neutral). */
  public static intents(): CorpusIntentInterface[] {
    return BookApiActionCorpus.COMMANDS.map((command) => ({
      intent: BookApiCommand[command],
      utterances: BookApiActionCorpus.spellingWords(command),
      answers: [`GET ${BookApiActionCorpus.ENDPOINTS[command]}`],
    }));
  }

  /** BOOK_AUTHOR_WORKS -> "book author works". */
  private static spellingWords(command: BookApiCommand): string[] {
    return [BookApiCommand[command].toLowerCase().replace(/_/g, " ")];
  }
}

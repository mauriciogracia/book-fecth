import { CorpusIntentInterface } from "../interfaces/CorpusIntentInterface";
import { BookApiAction } from "../models/BookApiAction";

/**
 * BookApiActionCorpus - Trains i2c on the Open Library book commands (BookApiAction enum, the single definition).
 * - An intent named after a BookCommand key maps to that command: no prompt-mapping.csv row needed.
 * - Every command is also trained on its spellings ("book fetch", "book author works"); the phrasings live in
 *   corpus-data/prompt-samples/<lang>-books.csv.
 * All are GET against https://openlibrary.org and need a value (query or OL id) extracted from the prompt.
 */
export class BookApiActionCorpus {
  private static readonly ENDPOINTS: Readonly<Record<BookApiAction, string>> = {
    [BookApiAction.BOOK_FETCH]: "/search.json",
    [BookApiAction.BOOK_WORK]: "/works/{work_id}.json",
    [BookApiAction.BOOK_AUTHOR]: "/authors/{author_id}.json",
    [BookApiAction.BOOK_AUTHOR_WORKS]: "/authors/{author_id}/works.json",
  };

  private static readonly COMMANDS: ReadonlyArray<BookApiAction> =
    Object.values(BookApiAction).filter(
      (value): value is BookApiAction => typeof value === "number",
    );

  /** The BookCommand of an intent named after one; undefined for any other intent. */
  public static commandOf(intent: string): BookApiAction | undefined {
    try {
      return parseBookCommand(intent);
    } catch {
      return undefined;
    }
  }

  /** True when the intent is a book command. */
  public static isBook(intent: string): boolean {
    return BookCommandCorpus.commandOf(intent) !== undefined;
  }

  /** The endpoint template of a command (`/works/{work_id}.json`). */
  public static endpointOf(command: BookApiAction): string {
    return BookCommandCorpus.ENDPOINTS[command];
  }

  /** One intent per book command (its spellings are language-neutral). */
  public static intents(): CorpusIntentInterface[] {
    return BookCommandCorpus.COMMANDS.map((command) => ({
      intent: BookApiAction[command],
      utterances: BookCommandCorpus.spellingWords(command),
      answers: [`GET ${BookCommandCorpus.ENDPOINTS[command]}`],
    }));
  }

  /** BOOK_AUTHOR_WORKS -> "book author works". */
  private static spellingWords(command: BookApiAction): string[] {
    return [BookApiAction[command].toLowerCase().replace(/_/g, " ")];
  }
}

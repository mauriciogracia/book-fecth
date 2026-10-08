// BookApiAction.ts — Open Library commands for I2C intents
// BOOK_FETCH        -> GET /search.json
// BOOK_WORK         -> GET /works/{work_id}.json
// BOOK_AUTHOR       -> GET /authors/{author_id}.json
// BOOK_AUTHOR_WORKS -> GET /authors/{author_id}/works.json

const BASE_URL = "https://openlibrary.org";

export enum BookApiCommand {
  BOOK_FETCH = 1,
  BOOK_WORK = 2,
  BOOK_AUTHOR = 3,
  BOOK_AUTHOR_WORKS = 4,
}

// CSV intent name -> enum, e.g. parseBookApiCommand("BOOK_FETCH") === BookApiCommand.BOOK_FETCH
export function parseBookApiCommand(name: string): BookApiCommand {
  const value = BookApiCommand[name.trim().toUpperCase() as keyof typeof BookApiCommand];
  if (value === undefined) throw new BookApiActionError(`Unknown intent: ${name}`);
  return value;
}

export interface BookFetchParams {
  q?: string;
  title?: string;
  author?: string;
  limit?: number;
}

export interface BookIdParams {
  id: string; // e.g. "OL45883W" or "/works/OL45883W"
}

export interface BookAuthorWorksParams extends BookIdParams {
  limit?: number;
  offset?: number;
}

export type BookParams = {
  [BookApiCommand.BOOK_FETCH]: BookFetchParams;
  [BookApiCommand.BOOK_WORK]: BookIdParams;
  [BookApiCommand.BOOK_AUTHOR]: BookIdParams;
  [BookApiCommand.BOOK_AUTHOR_WORKS]: BookAuthorWorksParams;
};

export class BookApiActionError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
    public readonly url?: string
  ) {
    super(message);
    this.name = "BookApiActionError";
  }
}

export class BookApiAction {
  constructor(
    private readonly baseUrl: string = BASE_URL,
    private readonly timeoutMs: number = 10_000
  ) {}

  execute<C extends BookApiCommand>(command: C, params: BookParams[C]): Promise<unknown> {
    switch (command) {
      case BookApiCommand.BOOK_FETCH:
        return this.fetchBooks(params as BookFetchParams);
      case BookApiCommand.BOOK_WORK:
        return this.getWork(params as BookIdParams);
      case BookApiCommand.BOOK_AUTHOR:
        return this.getAuthor(params as BookIdParams);
      case BookApiCommand.BOOK_AUTHOR_WORKS:
        return this.getAuthorWorks(params as BookAuthorWorksParams);
      default:
        throw new BookApiActionError(`Unknown command: ${command}`);
    }
  }

  // BOOK_FETCH
  fetchBooks({ q, title, author, limit = 10 }: BookFetchParams) {
    if (!q && !title && !author) {
      throw new BookApiActionError("BOOK_FETCH requires q, title or author");
    }
    const qs = new URLSearchParams();
    if (q) qs.set("q", q);
    if (title) qs.set("title", title);
    if (author) qs.set("author", author);
    qs.set("limit", String(limit));
    qs.set(
      "fields",
      "key,title,author_name,author_key,first_publish_year,cover_i,edition_count"
    );
    return this.get(`/search.json?${qs}`);
  }

  // BOOK_WORK
  getWork({ id }: BookIdParams) {
    return this.get(`/works/${this.cleanId(id, "works")}.json`);
  }

  // BOOK_AUTHOR
  getAuthor({ id }: BookIdParams) {
    return this.get(`/authors/${this.cleanId(id, "authors")}.json`);
  }

  // BOOK_AUTHOR_WORKS
  getAuthorWorks({ id, limit = 10, offset = 0 }: BookAuthorWorksParams) {
    const qs = new URLSearchParams({ limit: String(limit), offset: String(offset) });
    return this.get(`/authors/${this.cleanId(id, "authors")}/works.json?${qs}`);
  }

  private cleanId(id: string, prefix: "works" | "authors"): string {
    const clean = id.trim().replace(new RegExp(`^/?${prefix}/`), "");
    if (!/^OL\d+[WA]$/.test(clean)) {
      throw new BookApiActionError(`Invalid Open Library ${prefix} id: ${id}`);
    }
    return clean;
  }

  private async get(path: string): Promise<unknown> {
    const url = `${this.baseUrl}${path}`;
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(this.timeoutMs),
    });
    if (!res.ok) {
      throw new BookApiActionError(`Open Library ${res.status} ${res.statusText}`, res.status, url);
    }
    return res.json();
  }
}

# Training i2c — notes

i2c is a local English/Spanish intent processor: it turns a plain-words prompt into a book command, or returns `null`
when the prompt is not a command. It never runs anything; the caller routes the result to `BookAction`. The model is
trained here and ships pre-trained (no training at runtime, nothing sent online).

## Daily workflow

1. Edit the training data (`corpus-data/`, see below).
2. `./train.sh` — builds, trains and checks:
   - every 5th example of each label is held out (`HOLDOUT_EVERY`, `src/services/I2cTrainer.ts`) and the model is
     measured on them; each wrong one prints as a `miss [lang] "utterance": expected X, got Y` line;
   - held-out accuracy below **85%** (`MIN_ACCURACY`, `src/cli/TrainCli.ts`) fails the run and **keeps the previous
     model**;
   - otherwise the model is written to `model/i2c-model.json`.
3. `./i2c.sh` — REPL over the saved model: type prompts, see locale, intent, score and the command (nothing runs).
4. Commit `model/i2c-model.json`. Publishing never retrains.

A prompt counts as understood when its intent is not `None` and its score is at least **0.7** (`MIN_SCORE`,
`src/services/I2cService.ts`).

## Training data — `corpus-data/`

- `prompt-samples/<lang>-<anything>.csv` — the `en-` / `es-` prefix sets the language. Current files:
  `*-books.csv` (book commands), `*-none.csv`.
- One example per line: `"utterance", LABEL`. Inside quotes, `""` is a literal `"`. Blank lines and `# comments` are
  skipped; duplicates (per language and label) are dropped.
- **`None`** examples (general questions) keep those prompts out of the book commands. Add one whenever a normal
  question gets turned into a command.
- **Quoted values are masked**: before classifying (training and runtime) every `"…"`, `'…'`, `` `…` `` becomes the
  word `qvalue` (`QuotedValueMask`). The classifier learns the sentence shape, never the text in quotes.
- Tips: 30–50 examples per label and language; when two labels get confused (the `miss` lines), add contrast pairs
  that differ only in the deciding words (e.g. `BOOK_AUTHOR` vs `BOOK_AUTHOR_WORKS`: "author OL26320A" vs "works by
  author OL26320A").
- `CorpusBuilder` also writes `corpus-data/corpus.json` on every build (a debug view of the parsed corpus).

## Labels → commands — `corpus-data/prompt-mapping.csv`

One line per label: `LABEL,protocol,verb`. All book labels are `http,get` against `https://openlibrary.org` (JSON, no
key), executed by `BookAction.execute(BookCommand, params)`. `parseBookCommand(label)` maps the CSV name to the
numeric enum.

| Label             | Enum | Mapping line                 | Endpoint                          | Params                            |
| ----------------- | ---- | ---------------------------- | --------------------------------- | --------------------------------- |
| BOOK_FETCH        | 1    | `BOOK_FETCH,http,get`        | `/search.json`                    | `q` / `title` / `author`, `limit` |
| BOOK_WORK         | 2    | `BOOK_WORK,http,get`         | `/works/{work_id}.json`           | work id (`OL…W`)                  |
| BOOK_AUTHOR       | 3    | `BOOK_AUTHOR,http,get`       | `/authors/{author_id}.json`       | author id (`OL…A`)                |
| BOOK_AUTHOR_WORKS | 4    | `BOOK_AUTHOR_WORKS,http,get` | `/authors/{author_id}/works.json` | author id, `limit`, `offset`      |

- A label without a line here is still recognized but returns `null` (the prompt goes on as typed).

## Values (entities) — `src/services/NlpjsEntityRules.ts`

nlp.js regex rules, registered at training time and saved inside the model (**retrain after changing them**):

| Entity | What it matches                                                       | Used by                                         |
| ------ | --------------------------------------------------------------------- | ----------------------------------------------- |
| OL_ID  | an Open Library id: `OL\d+W` (work) or `OL\d+A` (author)              | BOOK_WORK, BOOK_AUTHOR, BOOK_AUTHOR_WORKS       |
| QUERY  | the free text left after removing command words (`find`, `busca`…)   | BOOK_FETCH (sent as `q`)                        |
| QUOTED | `"…"`, `'…'`, `` `…` `` — an exact title                              | BOOK_FETCH (sent as `title`)                    |

Keyword, filler (`the`, `la`, `book`, `libro`…) lists live in `KEYWORDS`. When matches overlap, the longer one wins;
on the same span: OL_ID > QUOTED > QUERY (`NlpjsEntityExtractor`).

## Adding a book command

1. Add a value to the `BookCommand` enum and its case in `BookAction.execute`.
2. Add the label to `prompt-mapping.csv` (`LABEL,http,get`).
3. Add en and es examples (`prompt-samples/<lang>-books.csv`), plus `None` examples for similar prompts that are not it.
4. If it needs a new kind of value, add a rule in `NlpjsEntityRules`.
5. `./train.sh`, check the misses, try it in `./i2c.sh`, commit the model.

## Code map — `src/`

| File                                 | Role                                                                    |
| ------------------------------------ | ----------------------------------------------------------------------- |
| `services/I2cService.ts`             | runtime API: `fromModel(json)`, `toCommand(prompt, lang?)` (pure)       |
| `services/NlpFactory.ts`             | the one way to build the nlp.js engine (en + es, in memory)             |
| `services/I2cTrainer.ts`             | train, held-out evaluation, export                                      |
| `services/CorpusBuilder.ts`          | reads `corpus-data/` into per-language corpora                          |
| `services/NlpjsEntityRules.ts`       | entity regex rules                                                      |
| `services/NlpjsEntityExtractor.ts`   | entities from the model, overlaps resolved (`EntityExtractorInterface`) |
| `services/QuotedValueMask.ts`        | quoted values → `qvalue` before classifying                             |
| `BookAction.ts`                      | `BookCommand` enum, `execute()`, Open Library `GET` calls               |
| `cli/TrainCli.ts` / `cli/ReplCli.ts` | `npm run train` / `npm run start`                                       |
| `nlpjs.d.ts`                         | types for the part of nlp.js i2c uses                                   |

## Known limits

- nlp.js `5.0.0-alpha.5` is barely maintained; entity extraction sits behind `EntityExtractorInterface` so a trained
  model can replace the rules later.
- `OL_ID` and `QUERY` rules are not implemented yet.
- `BOOK_FETCH` sends free text as `q`; splitting it into title / author is the LLM's job in Find That Book.

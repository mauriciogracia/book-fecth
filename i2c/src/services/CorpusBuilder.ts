import fs from "fs/promises";
import path from "path";
import { CorpusBuildResponseInterface } from "../interfaces/CorpusBuildResponseInterface";
import { CorpusInterface } from "../interfaces/CorpusInterface";
import { CorpusIntentInterface } from "../interfaces/CorpusIntentInterface";
import { I2cService } from "./I2cService";
import { BookApiActionCorpus } from "./BookApiActionCorpus";

const LANG_PATTERN = /^([a-z]{2})(?:[-_.]|$)/i; // en-files.csv, es_files.csv, en.csv
const HEADER_PATTERN = /^\s*"?(utterance|text|prompt)"?\s*,\s*"?intent"?\s*$/i;

export class CorpusBuilder {
  private readonly mappingsPath: string;
  private readonly samplesPath: string;
  private readonly outputPath: string;

  constructor(baseDir: string = process.cwd()) {
    const dataDir = path.join(baseDir, "corpus-data");
    this.mappingsPath = path.join(dataDir, "prompt-mapping.csv");
    this.samplesPath = path.join(dataDir, "prompt-samples");
    this.outputPath = path.join(dataDir, "corpus.json");
  }

  public async build(): Promise<CorpusBuildResponseInterface> {
    const mappings = await this.loadMappings();
    const corpora = new Map<string, CorpusInterface>();
    const intentIndex = new Map<string, CorpusIntentInterface>(); // key: `${lang}:${intent}`
    const seen = new Set<string>(); // key: `${lang}:${intent}:${utterance}`

    // Sorted for deterministic output
    const files = (await fs.readdir(this.samplesPath))
      .filter((f) => f.toLowerCase().endsWith(".csv"))
      .sort();

    for (const file of files) {
      const match = file.match(LANG_PATTERN);
      if (!match) {
        console.warn(`[CorpusBuilder] Skipping "${file}": no language prefix`);
        continue;
      }
      const lang = match[1].toLowerCase();

      let corpus = corpora.get(lang);
      if (!corpus) {
        corpus = { name: `i2c-corpus-${lang}`, locale: lang, data: [] };
        corpora.set(lang, corpus);
      }

      const content = await fs.readFile(
        path.join(this.samplesPath, file),
        "utf-8",
      );

      for (const line of this.readLines(content)) {
        if (HEADER_PATTERN.test(line)) continue;

        const parsed = this.splitLast(line);
        if (!parsed) continue;
        const [utterance, intent] = parsed;
        if (!utterance || !intent) continue;

        const intentKey = `${lang}:${intent}`;
        let entry = intentIndex.get(intentKey);
        if (!entry) {
          // An intent named after a BookApiCommand (BOOK_*) maps to its endpoint without a prompt-mapping.csv row
          const command = mappings.get(intent) ?? this.bookAnswer(intent);
          if (!command && intent !== I2cService.NONE_INTENT) {
            console.warn(
              `[CorpusBuilder] No mapping for intent "${intent}" (${lang})`,
            );
          }
          if (command && !BookApiActionCorpus.isBook(intent)) {
            console.warn(
              `[CorpusBuilder] Intent "${intent}" maps to "${command}", which is no BookApiCommand: BookApiAction cannot run it`,
            );
          }
          entry = { intent, utterances: [], answers: command ? [command] : [] };
          intentIndex.set(intentKey, entry);
          corpus.data.push(entry);
        }
        this.addUtterance(
          entry,
          `${intentKey}:${utterance.toLowerCase()}`,
          utterance,
          seen,
        );
      }
    }

    // Every BookApiCommand, from the enum (its spellings), in each language
    for (const corpus of corpora.values()) {
      for (const catalogIntent of BookApiActionCorpus.intents()) {
        const intentKey = `${corpus.locale}:${catalogIntent.intent}`;
        let entry = intentIndex.get(intentKey);
        if (!entry) {
          entry = { ...catalogIntent, utterances: [] };
          intentIndex.set(intentKey, entry);
          corpus.data.push(entry);
        }
        for (const utterance of catalogIntent.utterances) {
          this.addUtterance(
            entry,
            `${intentKey}:${utterance.toLowerCase()}`,
            utterance,
            seen,
          );
        }
      }
    }

    const result = Array.from(corpora.values());

    await fs.mkdir(path.dirname(this.outputPath), { recursive: true });
    await fs.writeFile(
      this.outputPath,
      JSON.stringify(result, null, 2),
      "utf-8",
    );

    return {
      success: true,
      message: `Corpus built: ${result.map((c) => `${c.locale} (${c.data.length} intents)`).join(", ")}`,
      data: result,
    };
  }

  /** BOOK_WORK -> "GET /works/{work_id}.json"; undefined for any other intent. */
  private bookAnswer(intent: string): string | undefined {
    const command = BookApiActionCorpus.commandOf(intent);
    return command === undefined
      ? undefined
      : `GET ${BookApiActionCorpus.endpointOf(command)}`;
  }

  private addUtterance(
    entry: CorpusIntentInterface,
    dupKey: string,
    utterance: string,
    seen: Set<string>,
  ): void {
    if (seen.has(dupKey)) return;
    seen.add(dupKey);
    entry.utterances.push(utterance);
  }

  private async loadMappings(): Promise<Map<string, string>> {
    const content = await fs.readFile(this.mappingsPath, "utf-8");
    const mappings = new Map<string, string>();

    for (const line of this.readLines(content)) {
      // Split on the FIRST comma so commands may contain commas
      const idx = line.indexOf(",");
      if (idx === -1) continue;

      const intent = this.unquote(line.substring(0, idx));
      const command = this.unquote(line.substring(idx + 1));
      if (!intent || !command || intent.toLowerCase() === "intent") continue;

      mappings.set(intent, command);
    }
    return mappings;
  }

  /** Splits "utterance,intent" on the last comma; utterance may contain commas. */
  private splitLast(line: string): [string, string] | null {
    const idx = line.lastIndexOf(",");
    if (idx === -1) return null;
    return [
      this.unquote(line.substring(0, idx)),
      this.unquote(line.substring(idx + 1)),
    ];
  }

  /** Trims, strips surrounding quotes and unescapes CSV doubled quotes (""). */
  private unquote(value: string): string {
    let v = value.trim();
    if (v.length >= 2 && v.startsWith('"') && v.endsWith('"')) {
      v = v.slice(1, -1).replace(/""/g, '"');
    }
    return v.trim();
  }

  /** Handles \r\n, BOM, blank lines and # comments. */
  private readLines(content: string): string[] {
    return content
      .replace(/^\uFEFF/, "")
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith("#"));
  }
}

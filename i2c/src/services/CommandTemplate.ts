import { I2cEntityName } from "../enums/I2cEntityName";
import { I2cEntityInterface } from "../interfaces/I2cEntityInterface";

/**
 * Fills a command template (corpus-data/prompt-mapping.csv) with the prompt's entities.
 * - Placeholders: {path} the entry the command works on, {target} the destination, {symbol} a code symbol, {lines} a
 *   line range (10-20), {old} {new} {content} quoted values (in that template order).
 * - `{x|name}`: only the last path segment. `{x!}`: required; without it the alternative is skipped.
 * - Alternatives: `A || B`: the first whose required values the prompt has.
 * When no alternative is complete, the closest one comes back pending: its missing required values stay as
 * placeholders (`/file replace src/a.ts {old} {new}`) for the user to supply (PendingCommand). A missing optional
 * value just leaves its placeholder out.
 */
export class CommandTemplate {
  public static readonly PLACEHOLDER = /\{(path|target|content|old|new|symbol|lines)(\|name)?(!)?\}/g;
  private static readonly QUOTED_ROLES: ReadonlyArray<string> = ["old", "new", "content"];
  private static readonly PATH_LIKE: ReadonlyArray<string> = [I2cEntityName.PATH, I2cEntityName.NAME, I2cEntityName.LOCATION, I2cEntityName.TARGET];
  private static readonly QUOTES = ['"', "'", "`"];

  /** The complete command of the first complete alternative; else the closest alternative, pending. */
  public static fill(template: string, entities: I2cEntityInterface[]): string {
    const candidates = template.split(/\s+\|\|\s+/).map((alternative) => {
      const values = CommandTemplate.assign(alternative, entities);
      const missing = [...alternative.matchAll(CommandTemplate.PLACEHOLDER)].filter((m) => m[3] && !values.has(m[1])).length;
      return { alternative, values, missing };
    });
    const best = candidates.reduce((a, b) => (b.missing < a.missing ? b : a));
    return CommandTemplate.render(best.alternative, best.values);
  }

  /** The value as one command argument: quoted when needed; a line range as `10-20`; `asName`: its last segment. */
  public static argument(role: string, value: string, asName = false): string {
    if (role === "lines") return value.trim().replace(/\s*(?:-|to|al|a)\s*/i, "-");
    if (asName) return CommandTemplate.asArgument(value.split("/").filter(Boolean).pop() ?? value);
    return CommandTemplate.asArgument(value);
  }

  /** Word by word, so a multi-line content keeps its line breaks; a missing required value stays as `{role}`. */
  private static render(template: string, values: Map<string, I2cEntityInterface>): string {
    return template
      .split(/\s+/)
      .map((word) =>
        word.replace(CommandTemplate.PLACEHOLDER, (_, role: string, asName?: string, required?: string) => {
          const entity = values.get(role);
          if (entity) return CommandTemplate.argument(role, CommandTemplate.unquote(entity.text), Boolean(asName));
          return required ? `{${role}${asName ?? ""}}` : "";
        })
      )
      .filter(Boolean)
      .join(" ");
  }

  /**
   * Who is who: SYMBOL and LINES are themselves; the last TARGET (else LOCATION) is the destination; quoted values fill
   * the quoted roles in order; the path is the first path-like value, else a quoted one the quoted roles do not need.
   */
  private static assign(template: string, entities: I2cEntityInterface[]): Map<string, I2cEntityInterface> {
    const values = new Map<string, I2cEntityInterface>();
    const roles = [...template.matchAll(CommandTemplate.PLACEHOLDER)];
    const wants = (role: string) => roles.some((m) => m[1] === role);
    const first = (name: I2cEntityName) => entities.find((e) => e.entity === name);
    const last = (name: I2cEntityName) => [...entities].reverse().find((e) => e.entity === name);

    for (const [role, name] of [["symbol", I2cEntityName.SYMBOL], ["lines", I2cEntityName.LINES]] as const) {
      const entity = first(name);
      if (entity && wants(role)) values.set(role, entity);
    }
    const destination = wants("target") ? last(I2cEntityName.TARGET) ?? last(I2cEntityName.LOCATION) : undefined;
    if (destination) values.set("target", destination);

    const used = new Set(values.values());
    // Quoted: QUOTED values, and a quoted TARGET / LOCATION nobody took as destination (change "http" to "https")
    const quoted = entities.filter((e) => !used.has(e) && (e.entity === I2cEntityName.QUOTED || CommandTemplate.QUOTES.includes(e.text[0])));
    const pathLike = entities.filter((e) => !used.has(e) && !quoted.includes(e) && CommandTemplate.PATH_LIKE.includes(e.entity));
    const quotedRoles = [...new Set(roles.map((m) => m[1]).filter((role) => CommandTemplate.QUOTED_ROLES.includes(role)))];
    const requiredQuoted = roles.filter((m) => m[3] && CommandTemplate.QUOTED_ROLES.includes(m[1])).length;

    // "create file 'my notes.txt'": a quoted value is the path when nothing else is and the quoted roles can spare it
    if (wants("path") && pathLike.length === 0 && quoted.length > requiredQuoted) {
      const spare = quoted.find((e) => CommandTemplate.looksLikePath(e)) ?? quoted[0];
      pathLike.push(spare);
      quoted.splice(quoted.indexOf(spare), 1);
    }
    quotedRoles.forEach((role, index) => quoted[index] && values.set(role, quoted[index]));
    if (wants("path") && pathLike[0]) values.set("path", pathLike[0]);
    return values;
  }

  private static looksLikePath(entity: I2cEntityInterface): boolean {
    return /^[\w./-]+$/.test(CommandTemplate.unquote(entity.text)) && /[/.]/.test(entity.text);
  }

  /** Text without its quotes; a ``` block without its fences and language tag. */
  private static unquote(text: string): string {
    const fenced = /^```[^\n]*\n?([\s\S]*?)\n?```$/.exec(text);
    if (fenced) return fenced[1];
    const quote = text[0];
    return CommandTemplate.QUOTES.includes(quote) && text.endsWith(quote) && text.length > 1 ? text.slice(1, -1) : text;
  }

  /** Bare when it is one plain word; otherwise wrapped in the first quote it does not contain (CommandTokenizer reads all three). */
  private static asArgument(value: string): string {
    if (/^[^\s"'`|]+$/.test(value)) return value;
    const quote = CommandTemplate.QUOTES.find((q) => !value.includes(q)) ?? '"';
    return `${quote}${value}${quote}`;
  }
}

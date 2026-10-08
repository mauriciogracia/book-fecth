// The part of nlp.js (@nlpjs, 5.0.0-alpha.5) i2c uses; the packages ship without types.

declare module "@nlpjs/core" {
  export interface NlpjsContainerInterface {
    /** Registers a plugin class (e.g. LangEn). */
    use(plugin: object): void;
    registerConfiguration(tag: string, configuration: Record<string, boolean | number>, overwrite?: boolean): void;
  }
  export function containerBootstrap(): NlpjsContainerInterface;
}

declare module "@nlpjs/nlp" {
  import { NlpjsContainerInterface } from "@nlpjs/core";

  export interface NlpjsSettingsInterface {
    languages: string[];
    autoLoad: boolean;
    autoSave: boolean;
  }

  export interface NlpjsEntityInterface {
    entity: string;
    sourceText: string;
    start: number;
    end: number;
  }

  export interface NlpjsEntitiesResponseInterface {
    entities: NlpjsEntityInterface[];
  }

  export interface NlpjsResponseInterface {
    locale: string;
    intent: string;
    score: number;
    answer?: string;
  }

  export class Nlp {
    constructor(settings: NlpjsSettingsInterface, container: NlpjsContainerInterface);
    addDocument(locale: string, utterance: string, intent: string): void;
    addAnswer(locale: string, intent: string, answer: string): void;
    train(): Promise<void>;
    process(locale: string | undefined, utterance: string): Promise<NlpjsResponseInterface>;
    addNerRegexRule(locale: string, name: string, regex: RegExp): void;
    extractEntities(locale: string | undefined, utterance: string): Promise<NlpjsEntitiesResponseInterface>;
    export(minified?: boolean): string;
    import(data: string): void;
  }
}

declare module "@nlpjs/lang-en" {
  export const LangEn: object;
}

declare module "@nlpjs/lang-es" {
  export const LangEs: object;
}

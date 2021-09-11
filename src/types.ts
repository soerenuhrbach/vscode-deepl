export interface Language {
  language: string;
  name: string;
};

export interface Translation {
  /* eslint-disable-next-line */
  detected_source_language: string;
  text: string;
};

export type LanguageType = 'source' | 'target';

export interface ExtensionState {
  targetLanguage: string | null,
  apiKey: string | null,
  usePro: boolean,
  formality: string,
  splitSentences: string,
  languages: {
    source: Language[],
    target: Language[]
  }
};

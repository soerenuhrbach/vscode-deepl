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
  tagHandling: 'html' | 'xml' | 'off',
  ignoreTags: string,
  formality: string,
  nonSplittingTags: string,
  splittingTags: string,
  splitSentences: string,
  preserveFormatting: boolean,
  languages: {
    source: Language[],
    target: Language[]
  }
};

export interface TranslateCommandParam {
  askForTargetLang: boolean
  askForSourceLang: boolean
  below: boolean
}

export interface TranslateParam {
  targetLang: string
  sourceLang?: string
  below: boolean
}

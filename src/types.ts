import type { Formality, GlossaryId, SentenceSplittingMode, SourceLanguageCode, TagHandlingMode, TagList, TargetLanguageCode } from "deepl-node";

export interface ExtensionState {
  apiKey: string | undefined,
  targetLanguage?: TargetLanguageCode,
  sourceLanguage?: SourceLanguageCode,
  tagHandling?: TagHandlingMode,
  ignoreTags?: TagList,
  formality?: Formality,
  nonSplittingTags?: TagList,
  splittingTags?: TagList,
  splitSentences?: SentenceSplittingMode,
  preserveFormatting?: boolean,
  glossaryId?: GlossaryId
  translationMode: TranslationMode
}

export enum TranslationMode {
  Replace = "Replace",
  InsertLineBelow = "InsertLineBelow",
  InsertLineAbove = "InsertLineAbove"
}
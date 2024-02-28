import * as vscode from 'vscode';
import { state } from './state';
import { Language, SourceLanguageCode, TargetLanguageCode, TextResult, Translator } from 'deepl-node';
import { EXTENSION_IDENTIFIER } from './constants';

const cache = {
  targetLanguages: [] as readonly Language[],
  sourceLanguages: [] as readonly Language[],
};

const createTranslator = (apiKey: string) => {
  const extension = vscode.extensions.getExtension(EXTENSION_IDENTIFIER)?.packageJSON;
  const appName = extension?.name;
  const appVersion = extension?.version;

  return new Translator(apiKey, {
    appInfo: {
      appName: appName,
      appVersion: appVersion
    },
    sendPlatformInfo: false
  });
};

export function translate<T extends string | string[]>(texts: T, sourceLang: SourceLanguageCode | null, targetLang: TargetLanguageCode): Promise<T extends string ? TextResult : TextResult[]> {
  const translator = createTranslator(state.apiKey!);
  return translator.translateText(
    texts,
    sourceLang ?? null,
    targetLang,
    {
      formality: state.formality || undefined,
      glossary: state.glossaryId || undefined,
      ignoreTags: state.ignoreTags || undefined,
      nonSplittingTags: state.nonSplittingTags || undefined,
      splittingTags: state.splittingTags || undefined,
      preserveFormatting: state.preserveFormatting || undefined,
      splitSentences: state.splitSentences || undefined,
      tagHandling: state.tagHandling || undefined
    }
  );
}

export async function getTargetLanguages() {
  if (!state.apiKey) {
    return [];
  }

  if (cache.targetLanguages.length > 0) {
    return cache.targetLanguages;
  }

  const translator = createTranslator(state.apiKey!);
  const languages = await translator.getTargetLanguages();
  cache.targetLanguages = languages;
  return languages;
}

export async function getSourceLanguages() {
  if (!state.apiKey) {
    return [];
  }

  if (cache.sourceLanguages.length > 0) {
    return cache.sourceLanguages;
  }

  const translator = createTranslator(state.apiKey!);
  const languages = await translator.getSourceLanguages();
  cache.sourceLanguages = languages;
  return languages;
}
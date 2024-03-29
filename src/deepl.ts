import * as vscode from 'vscode';
import * as debug from './debug';
import { state } from './state';
import { EXTENSION_IDENTIFIER } from './constants';
import { showApiKeyPrompt, showSourceLanguagePrompt, showTargetLanguagePrompt } from './prompts';
import { AuthorizationError, Language, SourceLanguageCode, TargetLanguageCode, TextResult, Translator } from 'deepl-node';

enum ResolveUnsuccessfulTranslationActions {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  SELECT_SOURCE_LANGUAGE = 'Select source language and try again',
  // eslint-disable-next-line @typescript-eslint/naming-convention
  CHANGE_TARGET_LANGUAGE = 'Change target language and try again'
}

enum ResolveAuthenticationError {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  CHANGE_API_KEY = 'Change api key and try again'
}

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

const handleTranslationFailure = async <T extends string | string[]>(texts: T, results: T extends string ? TextResult : TextResult[], sourceLanguage: SourceLanguageCode | undefined, targetLanguage: TargetLanguageCode, retries: number = 1) => {
  debug.write('The translation result is the with the original input');

  const selectedAction = await vscode.window.showWarningMessage(
    'Translation was not successful!',
    { 
      detail: sourceLanguage
        ? `Please check if you are using the correct source and target language. \n\n Source language: '${sourceLanguage}' \n Target language: '${targetLanguage}'`
        : `It is possible that the source language could not be recognized correctly or the wrong target language has been selected. \n\n Target language: '${targetLanguage}'`,
      modal: true
    },
    ResolveUnsuccessfulTranslationActions.SELECT_SOURCE_LANGUAGE,
    ResolveUnsuccessfulTranslationActions.CHANGE_TARGET_LANGUAGE);

  if (selectedAction === ResolveUnsuccessfulTranslationActions.SELECT_SOURCE_LANGUAGE) {
    const newSourceLanguage = await showSourceLanguagePrompt();
    if (newSourceLanguage) {
      debug.write(`Retrying translation with new source language '${newSourceLanguage}'`);
      return await translate(texts, newSourceLanguage, targetLanguage, retries - 1);
    }
  }

  if (selectedAction === ResolveUnsuccessfulTranslationActions.CHANGE_TARGET_LANGUAGE) {
    const newTargetLanguage = await showTargetLanguagePrompt();
    if (newTargetLanguage) {
      state.targetLanguage = newTargetLanguage;
      debug.write(`Retrying translation with changed target language '${newTargetLanguage}'`);
      return await translate(texts, sourceLanguage, newTargetLanguage, retries - 1);
    }
  }

  return results;
};

const handleAuthorizationFailure = async (): Promise<{ apiKeyUpdated: boolean }> => {
  let apiKeyUpdated = false;

  const selectedAction = await vscode.window.showWarningMessage(
    'Authentication failed!',
    {
      detail: 'Please check if you are api key correct.',
      modal: true
    },
    ResolveAuthenticationError.CHANGE_API_KEY
  );

  if (selectedAction === ResolveAuthenticationError.CHANGE_API_KEY) {
    const newApiKey = await showApiKeyPrompt();
    if (newApiKey && newApiKey !== state.apiKey) {
      apiKeyUpdated = true;
      state.apiKey = newApiKey;
    }
  }

  return { apiKeyUpdated };
};

export async function translate<T extends string | string[]>(texts: T, sourceLanguage: SourceLanguageCode | undefined, targetLanguage: TargetLanguageCode, retries: number = 1): Promise<T extends string ? TextResult : TextResult[]> {
  if (!state.apiKey) {
    state.apiKey = await showApiKeyPrompt();
  }

  const translator = createTranslator(state.apiKey!);
  debug.write(
    sourceLanguage
      ? `Start translating '${texts}' to '${targetLanguage}'`
      : `Start translating '${texts}' from '${sourceLanguage}' to '${targetLanguage}'`
  );

  try {
    const results = await translator.translateText(
      texts,
      sourceLanguage ?? null,
      targetLanguage,
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
    const wasTranslationSuccessful = typeof texts === "string"
      ? (results as TextResult).text !== texts
      : (results as TextResult[]).filter((result, index) => result.text === texts[index]).length === 0;
  
    return !wasTranslationSuccessful && retries > 0
      ? handleTranslationFailure(texts, results, sourceLanguage, targetLanguage, retries - 1)
      : results;
  } catch (e: unknown) {
    if (e instanceof AuthorizationError && retries > 0) {
      const { apiKeyUpdated } = await handleAuthorizationFailure();
      if (apiKeyUpdated) {
        return translate(texts, sourceLanguage, targetLanguage, retries - 1);
      }
    }

    throw e;
  }
}

export async function getTargetLanguages(retries: number = 1) {
  if (!state.apiKey) {
    debug.write('Could not load target languages - api key is not configured!');
    return [];
  }

  if (cache.targetLanguages.length > 0) {
    return cache.targetLanguages;
  }

  try {
    const translator = createTranslator(state.apiKey);
    cache.targetLanguages = await translator.getTargetLanguages();
  } catch (e: unknown) {
    if (e instanceof AuthorizationError && retries > 0) {
      const { apiKeyUpdated } = await handleAuthorizationFailure();
      if (apiKeyUpdated) {
        return getTargetLanguages(retries - 1);
      }
    }
  }

  return cache.targetLanguages;
}

export async function getSourceLanguages(retries: number = 1) {
  if (!state.apiKey) {
    debug.write('Could not load source languages - api key is not configured!');
    return [];
  }

  if (cache.sourceLanguages.length > 0) {
    return cache.sourceLanguages;
  }

  try {
    const translator = createTranslator(state.apiKey);
    cache.sourceLanguages = await translator.getSourceLanguages();
  } catch (e) {
    if (e instanceof AuthorizationError && retries > 0) {
      const { apiKeyUpdated } = await handleAuthorizationFailure();
      if (apiKeyUpdated) {
        return getSourceLanguages(retries - 1);
      }
    }
  }

  return cache.sourceLanguages;
}
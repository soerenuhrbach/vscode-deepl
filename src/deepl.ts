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

// Bumped whenever the cache is invalidated, so an in-flight fetch started under a since-replaced
// api key can detect it is stale and discard its result instead of overwriting fresher data.
let cacheGeneration = 0;
let targetLanguagesFetch: Promise<readonly Language[]> | undefined;
let sourceLanguagesFetch: Promise<readonly Language[]> | undefined;

export function invalidateLanguageCache() {
  cache.targetLanguages = [];
  cache.sourceLanguages = [];
  cacheGeneration++;
  targetLanguagesFetch = undefined;
  sourceLanguagesFetch = undefined;
}

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

  // `retries` was already decremented once by the caller before invoking this handler - pass it
  // through unchanged here, otherwise the budget is consumed twice for a single retry attempt.
  if (selectedAction === ResolveUnsuccessfulTranslationActions.SELECT_SOURCE_LANGUAGE) {
    const newSourceLanguage = await showSourceLanguagePrompt();
    if (newSourceLanguage) {
      debug.write(`Retrying translation with new source language '${newSourceLanguage}'`);
      return await translate(texts, newSourceLanguage, targetLanguage, retries);
    }
  }

  if (selectedAction === ResolveUnsuccessfulTranslationActions.CHANGE_TARGET_LANGUAGE) {
    const newTargetLanguage = await showTargetLanguagePrompt();
    if (newTargetLanguage) {
      state.targetLanguage = newTargetLanguage;
      debug.write(`Retrying translation with changed target language '${newTargetLanguage}'`);
      return await translate(texts, sourceLanguage, newTargetLanguage, retries);
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
    } else if (newApiKey) {
      debug.write('The re-entered api key is identical to the currently configured one - not retrying.');
    }
  }

  return { apiKeyUpdated };
};

const resolveFormality = async (targetLanguage: TargetLanguageCode) => {
  if (!state.formality || state.formality === 'default') {
    return undefined;
  }

  const targetLanguages = await getTargetLanguages();
  const language = targetLanguages.find(candidate => candidate.code.toLowerCase() === targetLanguage.toLowerCase());
  if (!language?.supportsFormality) {
    debug.write(`Formality '${state.formality}' is not supported for target language '${targetLanguage}' - omitting it.`);
    return undefined;
  }

  return state.formality;
};

export async function translate<T extends string | string[]>(texts: T, sourceLanguage: SourceLanguageCode | undefined, targetLanguage: TargetLanguageCode, retries: number = 1): Promise<T extends string ? TextResult : TextResult[]> {
  if (!state.apiKey) {
    state.apiKey = await showApiKeyPrompt();
  }
  if (!state.apiKey) {
    throw new Error('Translation is not possible, because no DeepL API key was configured!');
  }

  const translator = createTranslator(state.apiKey);
  debug.write(
    sourceLanguage
      ? `Start translating '${texts}' from '${sourceLanguage}' to '${targetLanguage}'`
      : `Start translating '${texts}' to '${targetLanguage}'`
  );

  try {
    const results = await translator.translateText(
      texts,
      sourceLanguage ?? null,
      targetLanguage,
      {
        formality: await resolveFormality(targetLanguage),
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

const fetchLanguages = async (kind: 'target' | 'source', retries: number): Promise<readonly Language[]> => {
  try {
    const translator = createTranslator(state.apiKey!);
    return kind === 'target' ? await translator.getTargetLanguages() : await translator.getSourceLanguages();
  } catch (e: unknown) {
    if (e instanceof AuthorizationError && retries > 0) {
      const { apiKeyUpdated } = await handleAuthorizationFailure();
      if (apiKeyUpdated) {
        return fetchLanguages(kind, retries - 1);
      }
    }
    return [];
  }
};

export async function getTargetLanguages(retries: number = 1): Promise<readonly Language[]> {
  if (!state.apiKey) {
    debug.write('Could not load target languages - api key is not configured!');
    return [];
  }

  if (cache.targetLanguages.length > 0) {
    return cache.targetLanguages;
  }

  if (!targetLanguagesFetch) {
    const generation = cacheGeneration;
    const fetchPromise: Promise<readonly Language[]> = fetchLanguages('target', retries).then(languages => {
      // Discard the result if the cache was invalidated (e.g. the api key changed) while this
      // request was in flight, so an out-of-order response can't overwrite fresher data.
      if (generation === cacheGeneration) {
        cache.targetLanguages = languages;
      }
      // Only clear the tracking slot if it still points at this fetch - otherwise a newer fetch
      // started by an invalidation that happened while this stale one was in flight would have
      // its own tracking reference wiped out, causing a redundant duplicate request.
      if (targetLanguagesFetch === fetchPromise) {
        targetLanguagesFetch = undefined;
      }
      return languages;
    });
    targetLanguagesFetch = fetchPromise;
  }

  return targetLanguagesFetch;
}

export async function getSourceLanguages(retries: number = 1): Promise<readonly Language[]> {
  if (!state.apiKey) {
    debug.write('Could not load source languages - api key is not configured!');
    return [];
  }

  if (cache.sourceLanguages.length > 0) {
    return cache.sourceLanguages;
  }

  if (!sourceLanguagesFetch) {
    const generation = cacheGeneration;
    const fetchPromise: Promise<readonly Language[]> = fetchLanguages('source', retries).then(languages => {
      if (generation === cacheGeneration) {
        cache.sourceLanguages = languages;
      }
      if (sourceLanguagesFetch === fetchPromise) {
        sourceLanguagesFetch = undefined;
      }
      return languages;
    });
    sourceLanguagesFetch = fetchPromise;
  }

  return sourceLanguagesFetch;
}
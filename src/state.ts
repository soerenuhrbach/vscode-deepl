import * as vscode from 'vscode';
import * as deepl from './deepl';
import * as debug from './debug';
import { TranslationMode, type ExtensionState } from './types';
import { reactive, effect, ref } from '@vue/reactivity';
import { getDefaultSourceLanguage, getDefaultTargetLanguage } from './helper';
import { 
  DEEPL_CONFIGURATION_SECTION,
  CONFIG_API_KEY,
  CONFIG_FORMALITY,
  CONFIG_IGNORE_TAGS,
  CONFIG_TAG_HANDLING,
  CONFIG_SPLITTING_TAGS,
  CONFIG_SPLIT_SENTENCES,
  CONFIG_NON_SPLITTING_TAGS,
  CONFIG_PRESERVE_FORMATTING,
  CONFIG_GLOSSARY_ID,
  WORKSPACE_TARGET_LANGUAGE,
  WORKSPACE_SOURCE_LANGUAGE,
  CONFIG_TRANSLATION_MODE
} from './constants';
import { SourceLanguageCode, TargetLanguageCode } from 'deepl-node';

const initialized = ref(false);

export const state = reactive<ExtensionState>({
  apiKey: undefined,
  targetLanguage: undefined,
  sourceLanguage: undefined,
  tagHandling: undefined,
  ignoreTags: undefined,
  nonSplittingTags: undefined,
  splittingTags: undefined,
  preserveFormatting: undefined,
  formality: undefined,
  splitSentences: undefined,
  glossaryId: undefined,
  translationMode: TranslationMode.Replace
});

const loadExtensionState = async (context: vscode.ExtensionContext) => {
  const config = vscode.workspace.getConfiguration();

  debug.write('Loading extension state...');
  state.apiKey = await context.secrets.get(CONFIG_API_KEY);

  state.formality = config.get(CONFIG_FORMALITY) || undefined;
  state.glossaryId = config.get(CONFIG_GLOSSARY_ID) || undefined;
  state.ignoreTags = config.get(CONFIG_IGNORE_TAGS) || undefined;
  state.tagHandling = config.get(CONFIG_TAG_HANDLING) || undefined;
  state.splittingTags = config.get(CONFIG_SPLITTING_TAGS) || undefined;
  state.splitSentences = config.get(CONFIG_SPLIT_SENTENCES) || undefined;
  state.translationMode = config.get(CONFIG_TRANSLATION_MODE) || TranslationMode.Replace;
  state.nonSplittingTags = config.get(CONFIG_NON_SPLITTING_TAGS) || undefined;
  state.preserveFormatting = config.get(CONFIG_PRESERVE_FORMATTING) || undefined;

  state.targetLanguage = context.workspaceState.get<TargetLanguageCode>(WORKSPACE_TARGET_LANGUAGE) || getDefaultTargetLanguage(config);
  state.sourceLanguage = context.workspaceState.get<SourceLanguageCode>(WORKSPACE_SOURCE_LANGUAGE) || getDefaultSourceLanguage(config);

  debug.write(`Loaded extension state:`);
  debug.write(JSON.stringify(state, null, 2));
};

const migrateApiKeyFromConfigToSecrets = async (config: vscode.WorkspaceConfiguration, context: vscode.ExtensionContext) => {
  const apiKeyFromConfiguration = config.get<string>(CONFIG_API_KEY);
  if (!apiKeyFromConfiguration) {
    return;
  }

  await context.secrets.store(CONFIG_API_KEY, apiKeyFromConfiguration);
  config.update(CONFIG_API_KEY, apiKeyFromConfiguration, vscode.ConfigurationTarget.Global);
  debug.write('Moved api key from configuration to secret store.');
};

const migrateWorkspaceStates = async (context: vscode.ExtensionContext) => {
  const sourceLanguageToMigrate = context.workspaceState.get<string>('deepl:sourceLanguage');
  if (sourceLanguageToMigrate) {
    context.workspaceState.update(WORKSPACE_SOURCE_LANGUAGE, sourceLanguageToMigrate);
    context.workspaceState.update('deepl:sourceLanguage', undefined);
    debug.write('Moved source language to new workspace state key');
  }

  const targetLanguageToMigrate = context.workspaceState.get<string>('deepl:targetLanguage');
  if (targetLanguageToMigrate) {
    context.workspaceState.update(WORKSPACE_TARGET_LANGUAGE, sourceLanguageToMigrate);
    context.workspaceState.update('deepl:targetLanguage', undefined);
    debug.write('Moved target language to new workspace state key');
  }
};

export async function setup(context: vscode.ExtensionContext) {
  if (initialized.value) {
    return;
  }

  initialized.value = true;

  const config = vscode.workspace.getConfiguration();

  await migrateWorkspaceStates(context);
  await migrateApiKeyFromConfigToSecrets(config, context);

  effect(async () => {
    if (state.apiKey) {
      await Promise.all([
        deepl.getSourceLanguages(),
        deepl.getTargetLanguages()
      ]);
    }
  });

  await loadExtensionState(context);

  effect(() => state.apiKey ? context.secrets.store(CONFIG_API_KEY, state.apiKey) : context.secrets.delete(CONFIG_API_KEY));
  effect(() => config.update(CONFIG_FORMALITY, state.formality, vscode.ConfigurationTarget.Global));
  effect(() => config.update(CONFIG_IGNORE_TAGS, state.ignoreTags, vscode.ConfigurationTarget.Global));
  effect(() => config.update(CONFIG_TAG_HANDLING, state.tagHandling, vscode.ConfigurationTarget.Global));
  effect(() => config.update(CONFIG_SPLITTING_TAGS, state.splittingTags, vscode.ConfigurationTarget.Global));
  effect(() => config.update(CONFIG_NON_SPLITTING_TAGS, state.nonSplittingTags, vscode.ConfigurationTarget.Global));
  effect(() => config.update(CONFIG_SPLIT_SENTENCES, state.splitSentences, vscode.ConfigurationTarget.Global));
  effect(() => config.update(CONFIG_PRESERVE_FORMATTING, state.preserveFormatting, vscode.ConfigurationTarget.Global));
  effect(() => config.update(CONFIG_GLOSSARY_ID, state.glossaryId, vscode.ConfigurationTarget.Global));
  effect(() => config.update(CONFIG_TRANSLATION_MODE, state.translationMode, vscode.ConfigurationTarget.Global));
  effect(() => context.workspaceState.update(WORKSPACE_TARGET_LANGUAGE, state.targetLanguage));
  effect(() => context.workspaceState.update(WORKSPACE_SOURCE_LANGUAGE, state.sourceLanguage));

  const secretChangeListener = context.secrets.onDidChange((e) => {
    if (e.key !== CONFIG_API_KEY) {
      return;
    }

    debug.write(`Secret (${CONFIG_API_KEY}) has been changed!`);
    loadExtensionState(context);
  });

  const configurationChangeListener = vscode.workspace.onDidChangeConfiguration(e => {
    if (!e.affectsConfiguration(DEEPL_CONFIGURATION_SECTION)) {
      return;
    }

    debug.write(`Extension configuration has been changed!`);
    loadExtensionState(context);
  });

  context.subscriptions.push(secretChangeListener, configurationChangeListener);
}
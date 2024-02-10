import * as vscode from 'vscode';
import * as deepl from './deepl';
import * as debug from './debug';
import type { ExtensionState } from './types';
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
  WORKSPACE_SOURCE_LANGUAGE
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
  glossaryId: undefined
});

const loadExtensionState = async (config: vscode.WorkspaceConfiguration, context: vscode.ExtensionContext) => {
  debug.write('Loading extension state...');
  state.apiKey = await context.secrets.get(CONFIG_API_KEY);

  const sourceLanguages = await deepl.getSourceLanguages();
  const targetLanguages = await deepl.getTargetLanguages();

  state.formality = config.get(CONFIG_FORMALITY) ?? undefined;
  state.glossaryId = config.get(CONFIG_GLOSSARY_ID) ?? undefined;
  state.ignoreTags = config.get(CONFIG_IGNORE_TAGS) ?? undefined;
  state.tagHandling = config.get(CONFIG_TAG_HANDLING) ?? undefined;
  state.splittingTags = config.get(CONFIG_SPLITTING_TAGS) ?? undefined;
  state.splitSentences = config.get(CONFIG_SPLIT_SENTENCES) ?? undefined;
  state.nonSplittingTags = config.get(CONFIG_NON_SPLITTING_TAGS) ?? undefined;
  state.preserveFormatting = config.get(CONFIG_PRESERVE_FORMATTING) ?? undefined;

  const targetLanguage = context.workspaceState.get<TargetLanguageCode>(WORKSPACE_TARGET_LANGUAGE) ?? getDefaultTargetLanguage(config);
  state.targetLanguage = targetLanguage && targetLanguages.map(x => x.code.toLowerCase()).includes(targetLanguage.toLowerCase())
    ? targetLanguage
    : undefined;

  const sourceLanguage = context.workspaceState.get<SourceLanguageCode>(WORKSPACE_SOURCE_LANGUAGE) ?? getDefaultSourceLanguage(config);
  state.sourceLanguage = sourceLanguage && sourceLanguages.map(x => x.code.toLowerCase()).includes(sourceLanguage.toLowerCase())
    ? sourceLanguage
    : undefined;

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

// TODO: migrate workspace state for target language to new keys

const migrateWorkspaceStates = async (config: vscode.WorkspaceConfiguration, context: vscode.ExtensionContext) => {

};

export async function setup(context: vscode.ExtensionContext) {
  if (initialized.value) {
    return;
  }

  initialized.value = true;

  const config = vscode.workspace.getConfiguration();

  await migrateApiKeyFromConfigToSecrets(config, context);
  await loadExtensionState(config, context);

  effect(() => state.apiKey ? context.secrets.store(CONFIG_API_KEY, state.apiKey) : context.secrets.delete(CONFIG_API_KEY));
  effect(() => config.update(CONFIG_FORMALITY, state.formality, vscode.ConfigurationTarget.Global));
  effect(() => config.update(CONFIG_IGNORE_TAGS, state.ignoreTags, vscode.ConfigurationTarget.Global));
  effect(() => config.update(CONFIG_TAG_HANDLING, state.tagHandling, vscode.ConfigurationTarget.Global));
  effect(() => config.update(CONFIG_SPLITTING_TAGS, state.splittingTags, vscode.ConfigurationTarget.Global));
  effect(() => config.update(CONFIG_NON_SPLITTING_TAGS, state.nonSplittingTags, vscode.ConfigurationTarget.Global));
  effect(() => config.update(CONFIG_SPLIT_SENTENCES, state.splitSentences, vscode.ConfigurationTarget.Global));
  effect(() => config.update(CONFIG_PRESERVE_FORMATTING, state.preserveFormatting, vscode.ConfigurationTarget.Global));
  effect(() => config.update(CONFIG_GLOSSARY_ID, state.glossaryId, vscode.ConfigurationTarget.Global));
  effect(() => context.workspaceState.update(WORKSPACE_TARGET_LANGUAGE, state.targetLanguage));
  effect(() => context.workspaceState.update(WORKSPACE_SOURCE_LANGUAGE, state.sourceLanguage));

  const secretChangeListener = context.secrets.onDidChange((e) => {
    if (e.key !== CONFIG_API_KEY) {
      return;
    }

    debug.write(`Secret (${CONFIG_API_KEY}) has been changed!`);
    loadExtensionState(config, context);
  });

  const configurationChangeListener = vscode.workspace.onDidChangeConfiguration(e => {
    if (!e.affectsConfiguration(DEEPL_CONFIGURATION_SECTION)) {
      return;
    }

    debug.write(`Extension configuration has been changed!`);
    loadExtensionState(config, context);
  });

  context.subscriptions.push(secretChangeListener, configurationChangeListener);
}
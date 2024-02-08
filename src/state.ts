import * as vscode from 'vscode';
import * as debug from './debug';
import * as deepl from './deepl';
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

const initialized = ref(false);

export const state = reactive<ExtensionState>({
  targetLanguage: null,
  sourceLanguage: null,
  apiKey: null,
  tagHandling: "off",
  ignoreTags: "",
  nonSplittingTags: "",
  splittingTags: "",
  preserveFormatting: false,
  formality: "default",
  splitSentences: "1",
  languages: {
    source: [],
    target: []
  },
  glossaryId: ""
});

const loadExtensionState = async (config: vscode.WorkspaceConfiguration, context: vscode.ExtensionContext) => {
  debug.write('Loading extension state...');
  state.apiKey = await context.secrets.get(CONFIG_API_KEY) || null;

  if (state.languages.source.length < 1 && !!state.apiKey) {
    state.languages.source = await deepl.languages('source');
  }
  if (state.languages.target.length < 1 && !!state.apiKey) {
    state.languages.target = await deepl.languages('target');
  }

  state.formality = config.get(CONFIG_FORMALITY) ?? "default";
  state.ignoreTags = config.get(CONFIG_IGNORE_TAGS) ?? "";
  state.tagHandling = config.get(CONFIG_TAG_HANDLING) ?? "off";
  state.splittingTags = config.get(CONFIG_SPLITTING_TAGS) ?? "";
  state.splitSentences = config.get(CONFIG_SPLIT_SENTENCES) ?? "1";
  state.nonSplittingTags = config.get(CONFIG_NON_SPLITTING_TAGS) ?? "";
  state.preserveFormatting = config.get(CONFIG_PRESERVE_FORMATTING) ?? false;
  state.glossaryId = config.get(CONFIG_GLOSSARY_ID) ?? "";

  const targetLanguage = context.workspaceState.get<string>(WORKSPACE_TARGET_LANGUAGE) ?? getDefaultTargetLanguage(config);
  state.targetLanguage = targetLanguage && state.languages.target.map(x => x.language.toLowerCase()).includes(targetLanguage.toLowerCase())
    ? targetLanguage
    : null;

  const sourceLanguage = context.workspaceState.get<string>(WORKSPACE_SOURCE_LANGUAGE) ?? getDefaultSourceLanguage(config);
  state.sourceLanguage = sourceLanguage && state.languages.source.map(x => x.language.toLowerCase()).includes(sourceLanguage.toLowerCase())
    ? sourceLanguage
    : null;

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

    debug.write(`ApiKey secret has been changed!`);
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
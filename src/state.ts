import * as vscode from 'vscode';
import * as debug from './debug';
import { ExtensionState } from './types';
import { reactive, watch, ref } from 'vue';
import { getDefaultSourceLanguage, getDefaultTargetLanguage } from './helper';

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

export function setup(context: vscode.ExtensionContext) {
  if (initialized.value) {
    return;
  }

  initialized.value = true;

  const config = vscode.workspace.getConfiguration('deepl');

  state.apiKey = config.get('apiKey') ?? null;
  state.formality = config.get('formality') ?? "default";
  state.ignoreTags = config.get('ignoreTags') ?? "";
  state.tagHandling = config.get('tagHandling') ?? "off";
  state.splittingTags = config.get('splittingTags') ?? "";
  state.splitSentences = config.get('splitSentences') ?? "1";
  state.nonSplittingTags = config.get('nonSplittingTags') ?? "";
  state.preserveFormatting = config.get('preserveFormatting') ?? false;
  state.glossaryId = config.get('glossaryId') ?? "";
  state.targetLanguage = context.workspaceState.get<string>('deepl:targetLanguage') ?? getDefaultTargetLanguage(config);
  state.sourceLanguage = context.workspaceState.get<string>('deepl:sourceLanguage') ?? getDefaultSourceLanguage(config);

  debug.write(`Initialized extension using state:`);
  debug.write(JSON.stringify(state, null, 2));

  watch(() => state.apiKey, () => config.update('apiKey', state.apiKey, vscode.ConfigurationTarget.Global));
  watch(() => state.formality, () => config.update('formality', state.formality, vscode.ConfigurationTarget.Global));
  watch(() => state.ignoreTags, () => config.update('ignoreTags', state.ignoreTags, vscode.ConfigurationTarget.Global));
  watch(() => state.tagHandling, () => config.update('tagHandling', state.tagHandling, vscode.ConfigurationTarget.Global));
  watch(() => state.splittingTags, () => config.update('splittingTags', state.splittingTags, vscode.ConfigurationTarget.Global));
  watch(() => state.nonSplittingTags, () => config.update('nonSplittingTags', state.nonSplittingTags, vscode.ConfigurationTarget.Global));
  watch(() => state.splitSentences, () => config.update('splitSentences', state.splitSentences, vscode.ConfigurationTarget.Global));
  watch(() => state.preserveFormatting, () => config.update('preserveFormatting', state.preserveFormatting, vscode.ConfigurationTarget.Global));
  watch(() => state.glossaryId, () => config.update('glossaryId', state.glossaryId, vscode.ConfigurationTarget.Global));
  watch(() => state.targetLanguage, () => context.workspaceState.update('deepl:targetLanguage', state.targetLanguage));
  watch(() => state.sourceLanguage, () => context.workspaceState.update('deepl:sourceLanguage', state.sourceLanguage));

  const configurationChangeListener = vscode.workspace.onDidChangeConfiguration(e => {
    if (!e.affectsConfiguration('deepl')) {
      return;
    }

    debug.write(`Extension configuration has changed! Updating extension state...`);

    const { apiKey, formality, splitSentences, tagHandling, ignoreTags, preserveFormatting, splittingTags, nonSplittingTags, glossaryId, defaultTargetLanguage, defaultSourceLanguage } = vscode.workspace.getConfiguration('deepl');

    state.apiKey = apiKey;
    state.formality = formality;
    state.ignoreTags = ignoreTags;
    state.tagHandling = tagHandling;
    state.splittingTags = splittingTags;
    state.splitSentences = splitSentences;
    state.nonSplittingTags = nonSplittingTags;
    state.preserveFormatting = preserveFormatting;
    state.glossaryId = glossaryId;
    state.targetLanguage = context.workspaceState.get<string>('deepl:targetLanguage') ?? defaultTargetLanguage ?? null;
    state.sourceLanguage = context.workspaceState.get<string>('deepl:sourceLanguage') ?? defaultSourceLanguage ?? null;

    debug.write(`Updated extension state to:`);
    debug.write(JSON.stringify(state, null, 2));
  });

  context.subscriptions.push(configurationChangeListener);
};
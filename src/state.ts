import * as vscode from 'vscode';
import { ExtensionState } from './types';
import { reactive, watch, ref } from 'vue';

const initialized = ref(false);

export const state = reactive<ExtensionState>({
  targetLanguage: null,
  apiKey: null,
  usePro: false,
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
  }
});

export function setup(context: vscode.ExtensionContext) {
  if (initialized.value) {
    return;
  }

  initialized.value = true;

  const config = vscode.workspace.getConfiguration('deepl');

  state.usePro = config.get('usePro') ?? false;
  state.apiKey = config.get('apiKey') ?? null;
  state.formality = config.get('formality') ?? "default";
  state.ignoreTags = config.get('ignoreTags') ?? "";
  state.tagHandling = config.get('tagHandling') ?? "off";
  state.splittingTags = config.get('splittingTags') ?? "";
  state.splitSentences = config.get('splitSentences') ?? "1";
  state.nonSplittingTags = config.get('nonSplittingTags') ?? "";
  state.preserveFormatting = config.get('preserveFormatting') ?? false;
  state.targetLanguage = context.workspaceState.get<string>('deepl:targetLanguage') ?? null;

  watch(() => state.usePro, () => config.update('usePro', state.usePro, vscode.ConfigurationTarget.Global));
  watch(() => state.apiKey, () => config.update('apiKey', state.apiKey, vscode.ConfigurationTarget.Global));
  watch(() => state.formality, () => config.update('formality', state.formality, vscode.ConfigurationTarget.Global));
  watch(() => state.ignoreTags, () => config.update('ignoreTags', state.ignoreTags, vscode.ConfigurationTarget.Global));
  watch(() => state.tagHandling, () => config.update('tagHandling', state.tagHandling, vscode.ConfigurationTarget.Global));
  watch(() => state.splittingTags, () => config.update('splittingTags', state.splittingTags, vscode.ConfigurationTarget.Global));
  watch(() => state.nonSplittingTags, () => config.update('nonSplittingTags', state.nonSplittingTags, vscode.ConfigurationTarget.Global));
  watch(() => state.splitSentences, () => config.update('splitSentences', state.splitSentences, vscode.ConfigurationTarget.Global));
  watch(() => state.preserveFormatting, () => config.update('preserveFormatting', state.preserveFormatting, vscode.ConfigurationTarget.Global));
  watch(() => state.targetLanguage, () => context.workspaceState.update('deepl:targetLanguage', state.targetLanguage));

  const configurationChangeListener = vscode.workspace.onDidChangeConfiguration(e => {
    if (!e.affectsConfiguration('deepl')) {
      return;
    }

    const { usePro, apiKey, formality, splitSentences, tagHandling, ignoreTags, preserveFormatting, splittingTags, nonSplittingTags } = vscode.workspace.getConfiguration('deepl');

    state.usePro = usePro;
    state.apiKey = apiKey;
    state.formality = formality;
    state.ignoreTags = ignoreTags;
    state.tagHandling = tagHandling;
    state.splittingTags = splittingTags;
    state.splitSentences = splitSentences;
    state.nonSplittingTags = nonSplittingTags;
    state.preserveFormatting = preserveFormatting;
  });

  context.subscriptions.push(configurationChangeListener);
};
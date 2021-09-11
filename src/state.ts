import * as vscode from 'vscode';
import { ExtensionState } from './types';
import { reactive, watch, ref } from 'vue';

const initialized = ref(false);

export const state = reactive<ExtensionState>({
  targetLanguage: null,
  apiKey: null,
  usePro: false,
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
  state.splitSentences = config.get('splitSentences') ?? "1";
  state.targetLanguage = context.workspaceState.get<string>('deepl:targetLanguage') ?? null;

  watch(() => state.usePro, () => config.update('usePro', state.usePro, vscode.ConfigurationTarget.Global));
  watch(() => state.apiKey, () => config.update('apiKey', state.apiKey, vscode.ConfigurationTarget.Global));
  watch(() => state.formality, () => config.update('formality', state.formality, vscode.ConfigurationTarget.Global));
  watch(() => state.splitSentences, () => config.update('splitSentences', state.splitSentences, vscode.ConfigurationTarget.Global));
  watch(() => state.targetLanguage, () => context.workspaceState.update('deepl:targetLanguage', state.targetLanguage));

  const configurationChangeListener = vscode.workspace.onDidChangeConfiguration(e => {
    if (!e.affectsConfiguration('deepl')) {
      return;
    }

    const { usePro, apiKey, formality, splitSentences } = vscode.workspace.getConfiguration('deepl');

    state.usePro = usePro;
    state.apiKey = apiKey;
    state.formality = formality;
    state.splitSentences = splitSentences;
  });

  context.subscriptions.push(configurationChangeListener);
};
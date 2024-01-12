import * as vscode from 'vscode';
import * as debug from './debug';
import * as deepl from './deepl';
import { ExtensionState } from './types';
import { reactive, effect, ref } from '@vue/reactivity';
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

const fillStateFromConfig = async (config: vscode.WorkspaceConfiguration, context: vscode.ExtensionContext) => {
  state.apiKey = config.get('apiKey') ?? null;

  if (state.languages.source.length < 1 && !!state.apiKey) {
    state.languages.source = await deepl.languages('source');
  }
  if (state.languages.target.length < 1 && !!state.apiKey) {
    state.languages.target = await deepl.languages('target');
  }

  state.formality = config.get('formality') ?? "default";
  state.ignoreTags = config.get('ignoreTags') ?? "";
  state.tagHandling = config.get('tagHandling') ?? "off";
  state.splittingTags = config.get('splittingTags') ?? "";
  state.splitSentences = config.get('splitSentences') ?? "1";
  state.nonSplittingTags = config.get('nonSplittingTags') ?? "";
  state.preserveFormatting = config.get('preserveFormatting') ?? false;
  state.glossaryId = config.get('glossaryId') ?? "";

  const targetLanguage = context.workspaceState.get<string>('deepl:targetLanguage') ?? getDefaultTargetLanguage(config);
  state.targetLanguage = targetLanguage && state.languages.target.map(x => x.language.toLowerCase()).includes(targetLanguage.toLowerCase())
    ? targetLanguage
    : null;

  const sourceLanguage = context.workspaceState.get<string>('deepl:sourceLanguage') ?? getDefaultSourceLanguage(config);
  state.sourceLanguage = sourceLanguage && state.languages.source.map(x => x.language.toLowerCase()).includes(sourceLanguage.toLowerCase())
    ? sourceLanguage
    : null;
};

export async function setup(context: vscode.ExtensionContext) {
  if (initialized.value) {
    return;
  }

  initialized.value = true;

  const config = vscode.workspace.getConfiguration('deepl');

  await fillStateFromConfig(config, context);

  debug.write(`Initialized extension using state:`);
  debug.write(JSON.stringify(state, null, 2));

  effect(() => config.update('apiKey', state.apiKey, vscode.ConfigurationTarget.Global));
  effect(() => config.update('formality', state.formality, vscode.ConfigurationTarget.Global));
  effect(() => config.update('ignoreTags', state.ignoreTags, vscode.ConfigurationTarget.Global));
  effect(() => config.update('tagHandling', state.tagHandling, vscode.ConfigurationTarget.Global));
  effect(() => config.update('splittingTags', state.splittingTags, vscode.ConfigurationTarget.Global));
  effect(() => config.update('nonSplittingTags', state.nonSplittingTags, vscode.ConfigurationTarget.Global));
  effect(() => config.update('splitSentences', state.splitSentences, vscode.ConfigurationTarget.Global));
  effect(() => config.update('preserveFormatting', state.preserveFormatting, vscode.ConfigurationTarget.Global));
  effect(() => config.update('glossaryId', state.glossaryId, vscode.ConfigurationTarget.Global));
  effect(() => context.workspaceState.update('deepl:targetLanguage', state.targetLanguage));
  effect(() => context.workspaceState.update('deepl:sourceLanguage', state.sourceLanguage));

  const configurationChangeListener = vscode.workspace.onDidChangeConfiguration(e => {
    if (!e.affectsConfiguration('deepl')) {
      return;
    }

    debug.write(`Extension configuration has changed! Updating extension state...`);

    const config = vscode.workspace.getConfiguration('deepl');

    fillStateFromConfig(config, context);

    debug.write(`Updated extension state to:`);
    debug.write(JSON.stringify(state, null, 2));
  });

  context.subscriptions.push(configurationChangeListener);
}
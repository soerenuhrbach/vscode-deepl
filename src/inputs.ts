import * as vscode from 'vscode';
import { LanguageType } from './types';
import { state } from './state';

async function showLanguageInput(options: vscode.QuickPickOptions, type: LanguageType): Promise<string | null> {
  const languages = state.languages[type]
    .map(language => ({
      label: language.name,
      description: language.language
    }));

  return vscode.window.showQuickPick(languages, options)
    .then(item => item?.description ?? null);
}

export function showTargetLanguageInput() {
  return showLanguageInput({ placeHolder: 'Select the language you want to translate into' }, 'target');
}

export function showSourceLanguageInput() {
  return showLanguageInput({ placeHolder: 'Select the language you want to translate from' }, 'source');
}

export function showApiKeyInput() {
  return vscode.window.showInputBox({
    title: 'Please enter your DeepL API key',
    placeHolder: 'Please enter your DeepL API key',
    ignoreFocusOut: true
  }).then(x => x ?? null);
}
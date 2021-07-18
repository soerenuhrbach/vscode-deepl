import * as deepl from './deepl';
import * as vscode from 'vscode';
import { LanguageType } from './types';

async function showLanguageInput(options: vscode.QuickPickOptions, type: LanguageType): Promise<string | null> {
  const languages = await deepl.languages(type)
    .then((languages): vscode.QuickPickItem[] => {
      return languages.map(language => ({
        label: language.name,
        description: language.language
      }));
    });

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

export function showUseProInput() {
  return vscode.window.showQuickPick(
    ['No', 'Yes'],
    {
      title: 'Do you want to use the DeepL Pro API?',
      placeHolder: 'Do you want to use the DeepL Pro API?',
      ignoreFocusOut: true
    }
  ).then(x => x === 'Yes');
}
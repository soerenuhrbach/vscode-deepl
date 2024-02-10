import * as vscode from 'vscode';
import * as deepl from './deepl';
import { Language, SourceLanguageCode, TargetLanguageCode } from 'deepl-node';

function showLanguageInput<T = SourceLanguageCode | TargetLanguageCode>(options: vscode.QuickPickOptions, languages: readonly Language[]): Thenable<T | undefined> {
  const items = languages.map(x => ({ label: x.name, description: x.code }));
  return vscode.window.showQuickPick(items, options)
    .then(item => item?.description as T | undefined);
}

export async function showTargetLanguageInput() {
  const languages = await deepl.getTargetLanguages();
  return showLanguageInput<TargetLanguageCode>({ placeHolder: 'Select the language you want to translate into' }, languages);
}

export async function showSourceLanguageInput() {
  const languages = await deepl.getSourceLanguages();
  return showLanguageInput<SourceLanguageCode>({ placeHolder: 'Select the language you want to translate from' }, languages);
}

export function showApiKeyInput() {
  return vscode.window.showInputBox({
    title: 'Please enter your DeepL API key',
    placeHolder: 'Please enter your DeepL API key',
    ignoreFocusOut: true
  }).then(x => x ?? undefined);
}
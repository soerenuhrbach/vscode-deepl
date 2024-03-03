import * as vscode from 'vscode';
import * as deepl from './deepl';
import { Language, SourceLanguageCode, TargetLanguageCode } from 'deepl-node';

function showLanguagePrompt<T = SourceLanguageCode | TargetLanguageCode>(options: vscode.QuickPickOptions, languages: readonly Language[]): Thenable<T | undefined> {
  const items = languages.map(x => ({ label: x.name, description: x.code }));
  return vscode.window.showQuickPick(items, options)
    .then(item => item?.description as T | undefined);
}

export async function showTargetLanguagePrompt() {
  const languages = await deepl.getTargetLanguages();
  return showLanguagePrompt<TargetLanguageCode>({ placeHolder: 'Select the language you want to translate into' }, languages);
}

export async function showSourceLanguagePrompt() {
  const languages = await deepl.getSourceLanguages();
  return showLanguagePrompt<SourceLanguageCode>({ placeHolder: 'Select the language you want to translate from' }, languages);
}

export function showApiKeyPrompt() {
  return vscode.window.showInputBox({
    title: 'Please enter your DeepL API key',
    placeHolder: 'Please enter your DeepL API key',
    ignoreFocusOut: true
  }).then(x => x ?? undefined);
}
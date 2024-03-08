import * as vscode from 'vscode';
import * as deepl from './deepl';
import { SourceLanguageCode, TargetLanguageCode } from 'deepl-node';

function showLanguagePrompt<T = SourceLanguageCode | TargetLanguageCode>(options: vscode.QuickPickOptions, languages: readonly { name: string, code: string | undefined }[]): Thenable<T | undefined> {
  const items = languages.map(x => ({ label: x.name, description: x.code }));
  return vscode.window.showQuickPick(items, options)
    .then(item => item?.description as T | undefined);
}

export async function showTargetLanguagePrompt() {
  const languages = await deepl.getTargetLanguages();
  return showLanguagePrompt<TargetLanguageCode>({ title: 'Select target language', placeHolder: 'Target language' }, languages);
}

export async function showSourceLanguagePrompt() {
  const languages = [
    { name: 'Detect language', code: undefined }, 
    ...await deepl.getSourceLanguages()
  ];
  return showLanguagePrompt<SourceLanguageCode>({ title: 'Select source language', placeHolder: 'Source language' }, languages);
}

export function showApiKeyPrompt() {
  return vscode.window.showInputBox({
    title: 'Please enter your DeepL API key',
    placeHolder: 'Please enter your DeepL API key',
    ignoreFocusOut: true
  }).then(x => x ?? undefined);
}
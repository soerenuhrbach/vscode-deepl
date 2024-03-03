import * as vscode from 'vscode';
import * as deepl from './deepl';
import { state } from './state';
import { effect } from '@vue/reactivity';
import { COMMAND_CONFIGURE, COMMAND_SET_TARGET_LANGAUGE } from './constants';

export function createStatusBarItem() {
  const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 10);

  effect(async () => {
    const prefix = '$(globe) ';

    if (!state.apiKey) {
      statusBarItem.text = prefix + 'Set your DeepL API key';
      statusBarItem.command = COMMAND_CONFIGURE;
      statusBarItem.tooltip = 'Set your DeepL API key';
    }

    if (state.apiKey) {
      statusBarItem.command = COMMAND_SET_TARGET_LANGAUGE;
      statusBarItem.tooltip = 'Select the language you want to translate into';
    }

    if (state.apiKey && !state.targetLanguage) {
      statusBarItem.command = COMMAND_SET_TARGET_LANGAUGE;
      statusBarItem.text = prefix + 'Select language';
    }

    if (state.apiKey && state.targetLanguage) {
      const languages = await deepl.getTargetLanguages();
      const selectedLanguage = languages.find(x => x.code.toLocaleLowerCase() === state.targetLanguage!.toLocaleLowerCase());
      statusBarItem.command = COMMAND_SET_TARGET_LANGAUGE;
      statusBarItem.text = prefix + (selectedLanguage?.name ?? state.targetLanguage);
    }
  });
  
  statusBarItem.show();

  return statusBarItem;
}
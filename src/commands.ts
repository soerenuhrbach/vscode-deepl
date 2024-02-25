import * as debug from './debug';
import * as deepl from './deepl';
import * as vscode from 'vscode';
import { state } from './state';
import { showMessageWithTimeout } from './vscode';
import { showApiKeyInput, showSourceLanguageInput, showTargetLanguageInput } from "./inputs";
import { getDefaultSourceLanguage, getDefaultTargetLanguage } from './helper';
import { SourceLanguageCode, TargetLanguageCode } from 'deepl-node';

function translateSelections(selections: vscode.Selection[], request: { targetLang: TargetLanguageCode, sourceLang: SourceLanguageCode | null, translateBelow: boolean }): Thenable<void> {
  const { targetLang, sourceLang, translateBelow } = request; 
  return vscode.window.withProgress({ location: vscode.ProgressLocation.Notification, title: 'Translating' }, async (progress) => {
    const increment = 100 / 2 / selections.length;

    const texts = selections.map(selection => vscode.window.activeTextEditor?.document.getText(selection));
    const translations = await Promise.all(
      texts.map(async text => {
        if (!text) {
          progress.report({ increment });
          return null;
        }

        debug.write(
          sourceLang
            ? `Start translating '${text}' to '${targetLang}'`
            : `Start translating '${text}' from '${sourceLang}' to '${targetLang}'`
        );
        const result = await deepl.translate(
          text, 
          sourceLang ?? null, 
          targetLang, 
        );
        progress.report({ increment });
        debug.write(
          result
            ? `Successfully translated '${text}' to '${result.text}'! (Source: '${result.detectedSourceLang}', Target: '${targetLang}')`
            : `'${text}' could be translated to '${targetLang}! (Reason: DeepL-API returned no translation)'`
        );
        return result;
      })
    );

    await vscode.window.activeTextEditor?.edit((editor: vscode.TextEditorEdit) => {
      for (const index in selections) {
        const selection = selections[index];
        const translation = translations[index];

        if (selection && translation) {
          let replacement = translation.text;

          if (translateBelow) {
            const originalText = vscode.window.activeTextEditor?.document.getText(selection);
            replacement = `${originalText}\n${translation.text}`;
          }

          editor.replace(selection, replacement);
        }

        progress.report({ increment });
      }
    });

    showMessageWithTimeout(`Translation completed!`, 3000);
  });
}

function createTranslateCommand(request: { askForTargetLang: boolean, askForSourceLang: boolean, translateBelow: boolean }) {
  const { askForTargetLang, askForSourceLang, translateBelow } = request;
  return async function () {
    if (!state.apiKey) {
      await configureSettings();
    }

    if (askForTargetLang || !state.targetLanguage) {
      const targetLanguage = await showTargetLanguageInput();

      if (!targetLanguage) {
        state.targetLanguage = getDefaultTargetLanguage();
        return;
      }

      state.targetLanguage = targetLanguage;
    }

    const sourceLang = askForSourceLang
      ? await showSourceLanguageInput()
      : state.sourceLanguage
        ? state.sourceLanguage
        : null;
    if (askForSourceLang && sourceLang) {
      state.sourceLanguage = sourceLang ?? getDefaultSourceLanguage();
    }

    if (state.targetLanguage === state.sourceLanguage) {
      state.sourceLanguage = undefined;
    }

    const selections = vscode.window.activeTextEditor?.selections?.filter(selection => !selection.isEmpty);
    if (!selections || selections.length === 0) {
      return;
    }

    await translateSelections(
      selections, 
      {
        targetLang: state.targetLanguage,
        sourceLang: sourceLang ?? null,
        translateBelow,
      }
    );
  };
}

export const translate = createTranslateCommand({ askForTargetLang: false, askForSourceLang: false, translateBelow: false });
export const translateTo = createTranslateCommand({ askForTargetLang: true, askForSourceLang: false, translateBelow: false });
export const translateFromTo = createTranslateCommand({ askForTargetLang: true, askForSourceLang: true, translateBelow: false });
export const translateBelow = createTranslateCommand({ askForTargetLang: false, askForSourceLang: false, translateBelow: true });
export const configureSettings = async () => {
  state.apiKey = await showApiKeyInput();
  if (!state.apiKey) {
    return;
  }
};

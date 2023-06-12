import * as deepl from './deepl';
import * as debug from './debug';
import * as vscode from 'vscode';
import { state } from './state';
import { showMessageWithTimeout } from './vscode';
import { showApiKeyInput, showSourceLanguageInput, showTargetLanguageInput, showUseProInput } from "./inputs";
import { TranslateCommandParam, TranslateParam } from './types';

function translateSelections(selections: vscode.Selection[], translateParam: TranslateParam): Thenable<void> {
  const { targetLang, sourceLang, below } = translateParam;
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
          !!sourceLang
            ? `Start translating '${text}' to '${targetLang}'`
            : `Start translating '${text}' from '${sourceLang}' to '${targetLang}'`
        );
        const translations = await deepl.translate(text, targetLang, sourceLang).catch(() => []);
        const result = translations.length > 0 ? translations[0] : null;
        progress.report({ increment });
        debug.write(
          !!result
            ? `Successfully translated '${text}' to '${result.text}'! (Source: '${result.detected_source_language}', Target: '${targetLang}')`
            : `'${text}' could be translated to '${targetLang}! (Reason: DeepL-API returned no translation)'`
        )
        return result;
      })
    );

    await vscode.window.activeTextEditor?.edit((editor: vscode.TextEditorEdit) => {
      for (const index in selections) {
        const selection = selections[index];
        const translation = translations[index];

        if (selection && translation) {
          let replacement = translation.text;

          if (below) {
            replacement = `${selection}\n${translation.text}`;
          }

          editor.replace(selection, replacement);
        }

        progress.report({ increment });
      }
    });

    showMessageWithTimeout(`Translation complete!`, 1500);
  });
};

function createTranslateCommand(param: TranslateCommandParam) {
  const { askForTargetLang, askForSourceLang, below } = param;
  return async function () {
    if (!state.apiKey) {
      await configureSettings();
    }

    const sourceLang = askForSourceLang
      ? await showSourceLanguageInput()
      : state.sourceLanguage
        ? state.sourceLanguage
        : null;
    if (askForSourceLang && sourceLang) {
      state.sourceLanguage = sourceLang;
    }

    if (askForTargetLang || !state.targetLanguage) {
      state.targetLanguage = await showTargetLanguageInput();

      if (!state.targetLanguage) {
        return;
      }
    }

    const selections = vscode.window.activeTextEditor?.selections?.filter(selection => !selection.isEmpty);
    if (!selections || selections.length === 0) {
      return;
    }

    const translateParam: TranslateParam = {
      targetLang: state.targetLanguage,
      sourceLang: sourceLang ?? undefined,
      below
    };
    translateSelections(selections, translateParam);
  };
}

export const translate = createTranslateCommand({ askForTargetLang: false, askForSourceLang: false, below: false });
export const translateTo = createTranslateCommand({ askForTargetLang: true, askForSourceLang: false, below: false });
export const translateFromTo = createTranslateCommand({ askForTargetLang: true, askForSourceLang: true, below: false });
export const translateBelow = createTranslateCommand({ askForTargetLang: false, askForSourceLang: false, below: true });
export const configureSettings = async () => {
  state.apiKey = await showApiKeyInput();
  if (!state.apiKey) {
    return;
  }
  state.usePro = await showUseProInput();
};

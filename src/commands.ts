import * as deepl from './deepl';
import * as vscode from 'vscode';
import { state } from './state';
import { showApiKeyInput, showSourceLanguageInput, showTargetLanguageInput, showUseProInput } from "./inputs";

interface TranslateCommandParam {
  askForTargetLang: boolean
  askForSourceLang: boolean
}

interface TranslateParam {
  targetLang: string
  sourceLang?: string
}

function translateSelections(selections: vscode.Selection[], translateParam: TranslateParam): Thenable<void> {
  const { targetLang, sourceLang } = translateParam;
  return vscode.window.withProgress({ location: vscode.ProgressLocation.Notification, title: 'Translating' }, async (progress) => {
    const increment = 100 / 2 / selections.length;

    const texts = selections.map(selection => vscode.window.activeTextEditor?.document.getText(selection));
    const translations = await Promise.all(	
      texts.map(async text => {
        if (!text) {
          progress.report({ increment });
          return null;
        }
  
        const translations = await deepl.translate(text, targetLang, sourceLang).catch(() => []);
        progress.report({ increment });
        return translations.length > 0 ? translations[0].text : null; 
      })
    );
  
    await vscode.window.activeTextEditor?.edit((editor: vscode.TextEditorEdit) => {
      for (const index in selections) {
        const selection = selections[index];
        const translation = translations[index];
        
        if (selection && translation) {
          editor.replace(selection, translation);
        }

        progress.report({ increment });
      }
    });
  });
};

function createTranslateCommand(param: TranslateCommandParam) {
  const { askForTargetLang, askForSourceLang } = param;
  return async function() {
    if (!state.apiKey) {
      await configureSettings();
    }

    const sourceLang = askForSourceLang ? await showSourceLanguageInput() : null;

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
    };
    translateSelections(selections, translateParam);
  };
}

export const translate = createTranslateCommand({askForTargetLang: false, askForSourceLang: false});
export const translateTo = createTranslateCommand({askForTargetLang: true, askForSourceLang: false});
export const translateFromTo = createTranslateCommand({askForTargetLang: true, askForSourceLang: true});
export const translateBelow = createTranslateCommand({askForTargetLang: false, askForSourceLang: false});
export const configureSettings = async () => {
  state.apiKey = await showApiKeyInput();
  if (!state.apiKey) {
    return;
  }
  state.usePro = await showUseProInput();
};
import * as debug from './debug';
import * as deepl from './deepl';
import * as vscode from 'vscode';
import { state } from './state';
import { showMessageWithTimeout } from './vscode-utils';
import { showApiKeyPrompt, showSourceLanguagePrompt, showTargetLanguagePrompt } from "./prompts";
import { getDefaultSourceLanguage, getDefaultTargetLanguage } from './helper';
import { SourceLanguageCode, TargetLanguageCode } from 'deepl-node';
import { TranslationMode } from './types';

type GetTargetAndSourceLanguageRequest = {
  forceTargetLanguagePrompt: boolean;
  forceSourceLanguagePrompt: boolean;
};

async function getTargetAndSourceLanguage (request: GetTargetAndSourceLanguageRequest): Promise<{ targetLanguage: TargetLanguageCode, sourceLanguage: SourceLanguageCode | undefined }> {
  let targetLanguage = state.targetLanguage ?? getDefaultTargetLanguage();
  if (request.forceTargetLanguagePrompt || !targetLanguage) {
    targetLanguage = await showTargetLanguagePrompt() ?? state.targetLanguage ?? getDefaultTargetLanguage();
  }
  if (!targetLanguage) {
    throw new Error('Translation is not possible, because no target language was selected!');
  }

  let sourceLanguage = state.sourceLanguage ?? getDefaultSourceLanguage();
  if (request.forceSourceLanguagePrompt) {
    sourceLanguage = await showSourceLanguagePrompt();
  }
  if (!sourceLanguage) {
    sourceLanguage = getDefaultSourceLanguage();
  } 

  if (targetLanguage === sourceLanguage || targetLanguage.slice(0, targetLanguage.indexOf('-')) === sourceLanguage) {
    sourceLanguage = undefined;
  }

  if (state.targetLanguage !== targetLanguage) {
    debug.write(`Set target language from '${state.targetLanguage}' to '${targetLanguage}'`);
    state.targetLanguage = targetLanguage;
  }

  if (state.sourceLanguage !== sourceLanguage) {
    debug.write(`Set source language from '${state.sourceLanguage}' to '${sourceLanguage}'`);
    state.sourceLanguage = sourceLanguage ?? undefined;
  }

  return { targetLanguage, sourceLanguage };
}

function displayTranslationNotification(execute: (progress: vscode.Progress<{ increment: number }>) => Promise<void> | void) {
  return vscode.window.withProgress({ location: vscode.ProgressLocation.Notification, title: 'Translating' }, async (progress) => {
    await execute(progress);
    showMessageWithTimeout(`Translation completed!`, 3000);
  });
}

function translateSelections(selections: vscode.Selection[], request: { targetLanguage: TargetLanguageCode, sourceLanguage: SourceLanguageCode | undefined }): Thenable<void> {
  const { targetLanguage, sourceLanguage } = request; 

  return displayTranslationNotification(async (progress) => {
    const increment = 100 / 2 / selections.length;

    const texts = selections.map(selection => vscode.window.activeTextEditor?.document.getText(selection));
    const translations = await Promise.all(
      texts.map(async text => {
        if (!text) {
          progress.report({ increment });
          return null;
        }

        debug.write(
          sourceLanguage
            ? `Start translating '${text}' to '${targetLanguage}'`
            : `Start translating '${text}' from '${sourceLanguage}' to '${targetLanguage}'`
        );
        const result = await deepl.translate(text, sourceLanguage, targetLanguage);
        progress.report({ increment });
        debug.write(
          result
            ? `Successfully translated '${text}' to '${result.text}'! (Source: '${result.detectedSourceLang}', Target: '${targetLanguage}')`
            : `'${text}' could not be translated to '${targetLanguage}! (Reason: DeepL-API returned no translation)'`
        );
        return result;
      })
    );

    await vscode.window.activeTextEditor?.edit((editor: vscode.TextEditorEdit) => {
      for (const index in selections) {
        const selection = selections[index];
        const translation = translations[index];

        if (selection && translation) {
          let replacement = null;
          const selectionText = vscode.window.activeTextEditor?.document.getText(selection);

          switch (state.translationMode) {
            case TranslationMode.InsertLineAbove:
              replacement = `${translation.text}\n${selectionText}`;
              break;

            case TranslationMode.InsertLineBelow:
              replacement = `${selectionText}\n${translation.text}`;
              break;
            
            default:
            case TranslationMode.Replace:
              replacement = translation.text;
          }

          editor.replace(selection, replacement ?? translation.text);
        }

        progress.report({ increment });
      }
    });
  });
}

function createTranslateSelectionsCommand(request: GetTargetAndSourceLanguageRequest) {
  return async function () {
    if (!state.apiKey) {
      await configureSettings();
    }

    const selections = vscode.window.activeTextEditor?.selections?.filter(selection => !selection.isEmpty);
    if (!selections || selections.length === 0) {
      return;
    }

    await translateSelections(selections, await getTargetAndSourceLanguage(request));
  };
}

export const setTargetLangauge = async () => state.targetLanguage = await showTargetLanguagePrompt();
export const configureSettings = async () => state.apiKey = await showApiKeyPrompt();

export const translate = createTranslateSelectionsCommand({ forceTargetLanguagePrompt: false, forceSourceLanguagePrompt: false });
export const translateTo = createTranslateSelectionsCommand({ forceTargetLanguagePrompt: true, forceSourceLanguagePrompt: false });
export const translateFromTo = createTranslateSelectionsCommand({ forceTargetLanguagePrompt: true, forceSourceLanguagePrompt: true });

export const translateAndPasteFromClipboard = async () => {
  const selections = vscode.window.activeTextEditor?.selections;
  if (!selections || selections.length === 0) {
    return;
  }

  const clipboardText = await vscode.env.clipboard.readText();
  if (!clipboardText) {
    return;
  }

  const { targetLanguage, sourceLanguage } = await getTargetAndSourceLanguage({
    forceSourceLanguagePrompt: false,
    forceTargetLanguagePrompt: false
  });

  return displayTranslationNotification(async (progress) => {
    const increment = 100 / 2 / selections.length;
    const translatedClipboardText = await deepl.translate(clipboardText, sourceLanguage, targetLanguage);
    progress.report({ increment: increment * selections.length });

    vscode.window.activeTextEditor?.edit((editor: vscode.TextEditorEdit) => {
      for (const selection of selections) {
        editor.replace(selection, translatedClipboardText.text);
        progress.report({ increment });
      }
    }); 
  });
};
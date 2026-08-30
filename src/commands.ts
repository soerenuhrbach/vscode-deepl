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

async function getTargetAndSourceLanguage (request: GetTargetAndSourceLanguageRequest = { forceSourceLanguagePrompt: false, forceTargetLanguagePrompt: false }): Promise<{ targetLanguage: TargetLanguageCode, sourceLanguage: SourceLanguageCode | undefined }> {
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
    try {
      await execute(progress);
      showMessageWithTimeout(`Translation completed!`, 3000);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      debug.write(`Translation failed: ${message}`);
      await vscode.window.showErrorMessage(`Translation failed: ${message}`);
    }
  });
}

function translateSelections(editor: vscode.TextEditor, selections: vscode.Selection[], request: { targetLanguage: TargetLanguageCode, sourceLanguage: SourceLanguageCode | undefined }): Thenable<void> {
  const { targetLanguage, sourceLanguage } = request;

  return displayTranslationNotification(async (progress) => {
    const increment = 100 / 2 / selections.length;

    // `editor` is captured once by the caller before any awaits below, so a tab switch or editor
    // close while the network request is in flight can't redirect the edit to a different document.
    const texts = selections.map(selection => editor.document.getText(selection));
    const translations = await Promise.all(
      texts.map(async text => {
        if (!text) {
          progress.report({ increment });
          return null;
        }

        const result = await deepl.translate(text, sourceLanguage, targetLanguage);
        progress.report({ increment });
        return result;
      })
    );

    await editor.edit((editBuilder: vscode.TextEditorEdit) => {
      for (const index in selections) {
        const selection = selections[index];
        const translation = translations[index];

        if (selection && translation) {
          let replacement = null;
          const selectionText = editor.document.getText(selection);

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

          editBuilder.replace(selection, replacement ?? translation.text);
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

    const editor = vscode.window.activeTextEditor;
    const selections = editor?.selections?.filter(selection => !selection.isEmpty);
    if (!editor || !selections || selections.length === 0) {
      return;
    }

    await translateSelections(editor, selections, await getTargetAndSourceLanguage(request));
  };
}

export const setTargetLanguage = async () => state.targetLanguage = await showTargetLanguagePrompt();
export const configureSettings = async () => state.apiKey = await showApiKeyPrompt();

export const translate = createTranslateSelectionsCommand({ 
  forceTargetLanguagePrompt: false, 
  forceSourceLanguagePrompt: false 
});
export const translateTo = createTranslateSelectionsCommand({ 
  forceTargetLanguagePrompt: true, 
  forceSourceLanguagePrompt: false 
});
export const translateToFrom = createTranslateSelectionsCommand({ 
  forceTargetLanguagePrompt: true, 
  forceSourceLanguagePrompt: true
});

export const duplicateAndTranslate = async () => {
  const editor = vscode.window.activeTextEditor;
  const selections = editor?.selections;
  if (!selections || selections.length === 0) {
    return;
  }

  const { targetLanguage, sourceLanguage } = await getTargetAndSourceLanguage();

  return displayTranslationNotification(async progress => {
    const increment = 100 / 2 / selections.length;

    const translationResults = await Promise.all(
      selections.map(async selection => {
        const duplicateWholeLine = selection.isEmpty && selection.isSingleLine;
        const range = duplicateWholeLine
          ? editor.document.lineAt(selection.start.line).range
          : new vscode.Range(
              selection.start.line, 
              selection.start.character,
              selection.end.line,
              selection.end.character
            );
        const text = editor.document.getText(range);
        const result = await deepl.translate(
          text, 
          sourceLanguage, 
          targetLanguage
        );
        progress.report({ increment });

        return {
          text,
          range,
          result,
          duplicateWholeLine
        };
      })
    );

    await editor.edit((editor: vscode.TextEditorEdit) => {
      for (const translationResult of translationResults) {
        const replacement = translationResult.duplicateWholeLine
          ? `${translationResult.text}\n${translationResult.result.text}`
          : `${translationResult.text}${translationResult.result.text}`;

        editor.replace(translationResult.range, replacement);
        progress.report({ increment });
      }
    });
  });
};

export const translateAndPasteFromClipboard = async () => {
  // Captured once up front, before any of the awaits below, so a tab switch while waiting for the
  // clipboard read / language prompt / network translation can't paste into the wrong document.
  const editor = vscode.window.activeTextEditor;
  const selections = editor?.selections;
  if (!editor || !selections || selections.length === 0) {
    return;
  }

  const clipboardText = await vscode.env.clipboard.readText();
  if (!clipboardText) {
    return;
  }

  const { targetLanguage, sourceLanguage } = await getTargetAndSourceLanguage();

  return displayTranslationNotification(async (progress) => {
    const increment = 100 / 2 / selections.length;
    const translatedClipboardText = await deepl.translate(
      clipboardText,
      sourceLanguage,
      targetLanguage
    );
    progress.report({ increment: increment * selections.length });

    await editor.edit((editBuilder: vscode.TextEditorEdit) => {
      for (const selection of selections) {
        editBuilder.replace(selection, translatedClipboardText.text);
        progress.report({ increment });
      }
    });
  });
};
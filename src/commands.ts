import * as deepl from './deepl';
import * as vscode from 'vscode';
import { state } from './state';
import { showApiKeyInput, showSourceLanguageInput, showTargetLanguageInput, showUseProInput } from "./inputs";

function translateSelections(selections: vscode.Selection[], targetLang: string, sourceLang?: string): Thenable<void> {
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

function createTranslateCommand(askForTargetLang: boolean = false, askForSourceLang: boolean = false) {
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

		translateSelections(selections, state.targetLanguage, sourceLang ?? undefined);
  };
}

export const translate = createTranslateCommand();
export const translateTo = createTranslateCommand(true);
export const translateFromTo = createTranslateCommand(true, true);
export const configureSettings = async () => {
	state.apiKey = await showApiKeyInput();
	if (!state.apiKey) {
		return;
	}
	state.usePro = await showUseProInput();
};
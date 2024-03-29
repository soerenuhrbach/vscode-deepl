import * as vscode from 'vscode';
import { setup } from './state';
import { createStatusBarItem } from './status-bar';
import { configureSettings, translate, translateToFrom, translateTo, translateAndPasteFromClipboard, setTargetLanguage, duplicateAndTranslate } from './commands';
import { COMMAND_CONFIGURE, COMMAND_TRANSLATE, COMMAND_TRANSLATE_TO_FROM, COMMAND_TRANSLATE_TO, COMMAND_TRANSLATE_AND_PASTE_FROM_CLIPBOARD, COMMAND_SET_TARGET_LANGAUGE, COMMAND_DUPLICATE_AND_TRANSLATE } from './constants';

export async function activate(context: vscode.ExtensionContext) {
  await setup(context);

  context.subscriptions.push(createStatusBarItem());	
  context.subscriptions.push(vscode.commands.registerCommand(COMMAND_CONFIGURE, configureSettings));
  context.subscriptions.push(vscode.commands.registerCommand(COMMAND_TRANSLATE, translate));
  context.subscriptions.push(vscode.commands.registerCommand(COMMAND_TRANSLATE_TO, translateTo));
  context.subscriptions.push(vscode.commands.registerCommand(COMMAND_TRANSLATE_TO_FROM, translateToFrom));
  context.subscriptions.push(vscode.commands.registerCommand(COMMAND_TRANSLATE_AND_PASTE_FROM_CLIPBOARD, translateAndPasteFromClipboard));
  context.subscriptions.push(vscode.commands.registerCommand(COMMAND_SET_TARGET_LANGAUGE , setTargetLanguage));
  context.subscriptions.push(vscode.commands.registerCommand(COMMAND_DUPLICATE_AND_TRANSLATE , duplicateAndTranslate));
}

export function deactivate() {}

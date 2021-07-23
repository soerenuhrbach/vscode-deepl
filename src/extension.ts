import * as deepl from './deepl';
import * as vscode from 'vscode';
import { setup } from './state';
import { createStatusBarItem } from './status-bar';
import { configureSettings, translate, translateFromTo, translateTo } from './commands';

export async function activate(context: vscode.ExtensionContext) {
  deepl.addErrorHandler(e => vscode.window.showErrorMessage(e.message));

  setup(context);

  context.subscriptions.push(createStatusBarItem());	
  context.subscriptions.push(vscode.commands.registerCommand('deepl.configure', configureSettings));
  context.subscriptions.push(vscode.commands.registerCommand('deepl.translate', translate));
  context.subscriptions.push(vscode.commands.registerCommand('deepl.translateTo', translateTo));
  context.subscriptions.push(vscode.commands.registerCommand('deepl.translateFromTo', translateFromTo));
}

export function deactivate() {}

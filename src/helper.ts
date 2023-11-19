import * as vscode from 'vscode';

export function getDefaultTargetLanguage(config?: vscode.WorkspaceConfiguration): string | null {
  config = config ?? vscode.workspace.getConfiguration('deepl');
  return config.get('defaultTargetLanguage', null);
}

export function getDefaultSourceLanguage(config?: vscode.WorkspaceConfiguration): string | null {
  config = config ?? vscode.workspace.getConfiguration('deepl');
  return config.get('defaultSourceLanguage', null);
}
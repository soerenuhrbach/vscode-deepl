import * as vscode from 'vscode';
import { CONFIG_DEFAULT_TARGET_LANGUAGE, CONFIG_DEFAULT_SOURCE_LANGUAGE } from './constants';

export function getDefaultTargetLanguage(config?: vscode.WorkspaceConfiguration): string | null {
  config = config ?? vscode.workspace.getConfiguration();
  return config.get(CONFIG_DEFAULT_TARGET_LANGUAGE, null);
}

export function getDefaultSourceLanguage(config?: vscode.WorkspaceConfiguration): string | null {
  config = config ?? vscode.workspace.getConfiguration();
  return config.get(CONFIG_DEFAULT_SOURCE_LANGUAGE, null);
}
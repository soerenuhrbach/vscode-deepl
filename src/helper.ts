import * as vscode from 'vscode';
import { CONFIG_DEFAULT_TARGET_LANGUAGE, CONFIG_DEFAULT_SOURCE_LANGUAGE } from './constants';
import { SourceLanguageCode, TargetLanguageCode } from 'deepl-node';

export function getDefaultTargetLanguage(config?: vscode.WorkspaceConfiguration): TargetLanguageCode | undefined {
  config = config ?? vscode.workspace.getConfiguration();
  return config.get<TargetLanguageCode>(CONFIG_DEFAULT_TARGET_LANGUAGE) || undefined;
}

export function getDefaultSourceLanguage(config?: vscode.WorkspaceConfiguration): SourceLanguageCode | undefined {
  config = config ?? vscode.workspace.getConfiguration();
  return config.get<SourceLanguageCode>(CONFIG_DEFAULT_SOURCE_LANGUAGE) || undefined;
}
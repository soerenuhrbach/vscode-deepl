import * as vscode from 'vscode';
const debugOutputChannel = vscode.window.createOutputChannel("DeepL");

export const write = (log: string) => debugOutputChannel.appendLine(log);
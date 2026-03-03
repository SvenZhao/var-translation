import * as vscode from 'vscode';

let outputChannel: vscode.OutputChannel | undefined;

function getOutputChannel(): vscode.OutputChannel {
  if (!outputChannel) {
    outputChannel = vscode.window.createOutputChannel('驼峰翻译助手');
  }
  return outputChannel;
}

function formatTimestamp(): string {
  return new Date().toISOString().replace('T', ' ').replace('Z', '');
}

export const TranslateLogger = {
  info(message: string) {
    getOutputChannel().appendLine(`[${formatTimestamp()}] [INFO] ${message}`);
  },

  error(message: string) {
    getOutputChannel().appendLine(`[${formatTimestamp()}] [ERROR] ${message}`);
  },

  warn(message: string) {
    getOutputChannel().appendLine(`[${formatTimestamp()}] [WARN] ${message}`);
  },

  show() {
    getOutputChannel().show();
  },

  dispose() {
    if (outputChannel) {
      outputChannel.dispose();
      outputChannel = undefined;
    }
  },
};

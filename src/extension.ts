import { window, ExtensionContext, commands, QuickPickItem, QuickPickOptions, workspace } from 'vscode';

const translate = require('@vitalets/google-translate-api');

import { camelCase, paramCase, pascalCase, snakeCase, constantCase } from 'change-case';
export function activate(context: ExtensionContext) {
  const disposable = commands.registerCommand('extension.varTranslation', main);
  context.subscriptions.push(disposable);
}
export function deactivate() {}
/**
 * 用户选择选择转换形式
 * @param word 需要转换的单词
 * @return  用户选择
 */
async function vscodeSelect(word: string): Promise<string | undefined> {
  const items: QuickPickItem[] = [];
  const opts: QuickPickOptions = { matchOnDescription: true, placeHolder: 'choose replace 选择替换' };
  items.push({ label: camelCase(word), description: 'camelCase 小驼峰' });
  items.push({ label: pascalCase(word), description: 'pascalCase 大驼峰' });
  items.push({ label: snakeCase(word), description: 'snakeCase 下划线' });
  items.push({ label: paramCase(word), description: 'paramCase 中划线' });
  items.push({ label: constantCase(word), description: 'constantCase 常量' });
  const selections = await window.showQuickPick(items, opts);
  if (!selections) {
    return;
  }
  return selections.label;
}

async function getTranslateResult(srcText: string) {
  const CONFIG = workspace.getConfiguration('varTranslation');
  const translationEngine = CONFIG.translationEngine;
  const tld = translationEngine === 'google' ? 'com' : 'cn';
  // 正则快速判断英文
  if (/^[a-zA-Z\d\s\-_]+$/.test(srcText)) {
    return srcText;
  }
  try {
    console.log(`使用${translationEngine}翻译内容:${srcText}`);
    const res = await translate(srcText, { to: 'en', tld });
    return res.text;
  } catch (error) {
    window.showInformationMessage(`引擎异常,翻译失败 请检查网络重启  ${JSON.stringify(error)}`);
    return null;
  }
}
async function main() {
  // 获取编辑器
  const editor = window.activeTextEditor;
  if (!editor) {
    return;
  }
  // 获取选中文字
  const { selection } = editor;
  const selected = editor.document.getText(selection);
  // 获取翻译结果
  const translated = await getTranslateResult(selected);
  if (!translated) {
    return;
  }
  // 组装选项
  const userSelected = await vscodeSelect(translated);
  // 用户选中
  if (!userSelected) {
    return;
  }
  // 替换文案
  editor.edit((builder) => builder.replace(selection, userSelected));
}

import { window, ExtensionContext, commands, QuickPickItem, QuickPickOptions, workspace } from 'vscode';

const translatePlatforms = require('translate-platforms');

import { camelCase, paramCase, pascalCase, snakeCase, constantCase, capitalCase, dotCase, headerCase, noCase, pathCase } from 'change-case';
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
  const items: QuickPickItem[] = [
    { label: camelCase(word), description: 'camelCase 驼峰(小)' },
    { label: pascalCase(word), description: 'pascalCase 驼峰(大)' },
    { label: snakeCase(word), description: 'snakeCase 下划线' },
    { label: paramCase(word), description: 'paramCase 中划线(小)' },
    { label: headerCase(word), description: 'headerCase 中划线(大)' },
    { label: noCase(word), description: 'noCase 分词(小)' },
    { label: capitalCase(word), description: 'capitalCase 分词(大)' },
    { label: dotCase(word), description: 'dotCase 对象属性' },
    { label: pathCase(word), description: 'pathCase 文件路径' },
    { label: constantCase(word), description: 'constantCase 常量' },
  ];
  const opts: QuickPickOptions = { matchOnDescription: true, placeHolder: 'choose replace 选择替换' };
  const selections = await window.showQuickPick(items, opts);
  if (!selections) {
    return;
  }
  return selections.label;
}

/**
 * 获取翻译引起
 */
async function getTranslateResult(srcText: string) {
  const engine = workspace.getConfiguration('varTranslation').translationEngine;
  const translate = translatePlatforms[engine] || translatePlatforms.google;
  // 正则快速判断英文
  if (/^[a-zA-Z\d\s\-_]+$/.test(srcText)) {
    return srcText;
  }
  try {
    console.log(`使用${engine}翻译内容:${srcText}`);
    const res = await translate(srcText, { to: 'en' });
    console.log('res', res);
    return res.text;
  } catch (error) {
    console.error(error);
    window.showInformationMessage(`${engine}翻译异常,请检查网络或稍后重试 ${JSON.stringify(error)}`);
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

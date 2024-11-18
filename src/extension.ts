/* eslint-disable no-useless-escape */
/* eslint-disable no-await-in-loop */
import { window, ExtensionContext, commands, QuickPickItem, QuickPickOptions, workspace } from 'vscode';
import translatePlatforms, { EengineType } from './inc/translate';
import { camelCase, paramCase, pascalCase, snakeCase, constantCase, capitalCase, dotCase, headerCase, noCase, pathCase } from 'change-case';
import { isChinese } from './utils';

interface IWordResult {
  engine: EengineType;
  srcText: string;
  result: string;
}

/** 翻译的内容缓存防止多次请求 */
const translateCacheWords: IWordResult[] = [];
const changeCaseMap = [
  { name: 'camelCase', handle: camelCase, description: 'camelCase 驼峰(小)' },
  { name: 'pascalCase', handle: pascalCase, description: 'pascalCase 驼峰(大)' },
  { name: 'snakeCase', handle: snakeCase, description: 'snakeCase 下划线' },
  { name: 'paramCase', handle: paramCase, description: 'paramCase 中划线(小)' },
  { name: 'headerCase', handle: headerCase, description: 'headerCase 中划线(大)' },
  { name: 'noCase', handle: noCase, description: 'noCase 分词(小)' },
  { name: 'capitalCase', handle: capitalCase, description: 'capitalCase 分词(大)' },
  { name: 'dotCase', handle: dotCase, description: 'dotCase 对象属性' },
  { name: 'pathCase', handle: pathCase, description: 'pathCase 文件路径' },
  { name: 'constantCase', handle: constantCase, description: 'constantCase 常量' },
];

let packageJSON: any;
const checkUpdate = async (context: ExtensionContext) => {
  packageJSON = context.extension.packageJSON;
  const { globalState } = context;
  const CACHE_KEY = `${packageJSON.name}-${packageJSON.version}`;
  const version = globalState.get(CACHE_KEY);
  const extensionVersion = packageJSON.version;

  if (version !== extensionVersion) {
    globalState.update(CACHE_KEY, extensionVersion);
    const contentText = `
    ${packageJSON.displayName}更新:\r
    新增 英汉互译\r,
    新增 翻译结果展示\r,
    新增 chagpt 支持自定义模型\r,
    优化 chagpt提示语 更适合开发场景\r,
    优化 展示翻译异常时候错误消息 方便找原因\r,
    `;
    window.showInformationMessage(contentText);
  }
};

export function activate(context: ExtensionContext) {
  checkUpdate(context);
  context.subscriptions.push(commands.registerCommand('extension.varTranslation', main));
  changeCaseMap.forEach((item) => {
    context.subscriptions.push(commands.registerCommand(`extension.varTranslation.${item.name}`, () => typeTranslation(item.name)));
  });
}

export function deactivate() { }

/**
 * 获取翻译引擎结果
 */
async function getTranslateResult(srcText: string, to: string) {
  const engine: EengineType = workspace.getConfiguration('varTranslation').translationEngine;
  const cache = translateCacheWords.find((item) => item.engine === engine && item.srcText === srcText);
  if (cache) {
    window.setStatusBarMessage(`${packageJSON.displayName} 使用缓存: ${srcText}`, 2000);
    return cache.result;
  }
  const translate = translatePlatforms[engine] || translatePlatforms.google;
  window.setStatusBarMessage(`${engine} 正在翻译到${to}: ${srcText}`, 2000);
  srcText = to === 'zh' ? noCase(srcText) : srcText
  const res = await translate(srcText, to);
  const result = res.text;

  if (result) {
    translateCacheWords.push({ engine, srcText, result });
  }
  return result;
}

/**
 * 用户选择转换形式
 * @param word 需要转换的单词
 * @return  用户选择
 */
async function vscodeSelect(word: string, quickPickItems: QuickPickItem[] = []): Promise<string | undefined> {
  const wordItems = changeCaseMap.map((item) => ({ label: item.handle(word), description: item.description }));
  const items: QuickPickItem[] = [...wordItems, ...quickPickItems];
  const opts: QuickPickOptions = { matchOnDescription: true, placeHolder: '选择替换' };
  const selections = await window.showQuickPick(items, opts);
  return selections?.label;
}

/**
 * 主翻译逻辑
 */
async function main() {
  const editor = window.activeTextEditor;
  if (!editor) return;

  for (const selection of editor.selections) {
    const selected = editor.document.getText(selection);
    const isZh = isChinese(selected);
    const to = isZh ? 'en' : 'zh';
    // 获取翻译结果或直接使用原文本
    const translated: string = await getTranslateResult(selected, to);
    const word = isZh ? translated : selected
    if (!word) return;

    const userSelected = await vscodeSelect(word, [{ label: translated, description: '翻译' }]);

    if (userSelected) {
      editor.edit((builder) => builder.replace(selection, userSelected));
    }
  }
}

/**
 * 转换变量名格式
 */
const typeTranslation = async (type: string) => {
  const changeCase = changeCaseMap.find((item) => item.name === type);
  if (!changeCase) return;

  const editor = window.activeTextEditor;
  if (!editor) return;

  for (const selection of editor.selections) {
    const selected = editor.document.getText(selection);
    const isZh = isChinese(selected);
    const word = isZh ? await getTranslateResult(selected, 'en') : selected;

    if (word) {
      editor.edit((builder) => builder.replace(selection, changeCase.handle(word)));
    }
  }
};

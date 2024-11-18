/* eslint-disable no-useless-escape */
/* eslint-disable no-await-in-loop */
import { window, ExtensionContext, commands, QuickPickItem, QuickPickOptions, workspace } from 'vscode';
import translatePlatforms, { EengineType } from './inc/translate';
import { changeCaseMap, isChinese } from './utils';
import { noCase } from 'change-case';

interface IWordResult {
  engine: EengineType;
  srcText: string;
  result: string;
}

/** 翻译的内容缓存防止多次请求 */
const translateCacheWords: IWordResult[] = [];

let packageJSON: any;

const checkUpdate = async (context: ExtensionContext) => {
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
  packageJSON = context.extension.packageJSON;
  checkUpdate(context);
  context.subscriptions.push(commands.registerCommand('extension.varTranslation', main));
  changeCaseMap.forEach((item) => {
    context.subscriptions.push(commands.registerCommand(`extension.varTranslation.${item.name}`, () => typeTranslation(item.name)));
  });
}

export function deactivate() { }

/**
 * 获取翻译结果或缓存翻译结果
 * @param srcText 原始文本
 * @param to 目标语言
 */
const getTranslation = async (srcText: string, to: string) => {
  const engine: EengineType = workspace.getConfiguration('varTranslation').translationEngine;
  const cache = translateCacheWords.find((item) => item.engine === engine && item.srcText === srcText);
  if (cache) {
    window.setStatusBarMessage(`${packageJSON.displayName} 使用缓存: ${srcText}`, 2000);
    return cache.result;
  }
  const translate = translatePlatforms[engine] || translatePlatforms.google;
  window.setStatusBarMessage(`${engine} 正在翻译到${to}: ${srcText}`, 2000);
  /* 翻译时 转换成分词的小写形式 */
  srcText = to === 'zh' ? noCase(srcText) : srcText;
  const res = await translate(srcText, to);
  const result = res.text;
  if (result) {
    translateCacheWords.push({ engine, srcText, result });
  }
  return result;
};

/**
 * 执行选择替换操作
 * @param word 需要处理的单词
 * @param quickPickItems 可选的快速选择项
 * @returns 用户选择的文本
 */
const selectAndReplace = async (word: string, quickPickItems: QuickPickItem[] = []): Promise<string | undefined> => {
  const wordItems = changeCaseMap.map((item) => ({ label: item.handle(word), description: item.description }));
  const items: QuickPickItem[] = [...wordItems, ...quickPickItems];
  const opts: QuickPickOptions = { matchOnDescription: true, placeHolder: '选择替换' };
  const selections = await window.showQuickPick(items, opts);
  return selections?.label;
};

/**
 * 编辑器中替换选中的文本
 * @param editor 编辑器实例
 * @param selection 选中的范围
 * @param newText 替换后的文本
 */
const replaceTextInEditor = (editor: any, selection: any, newText: string) => {
  editor.edit((builder: any) => builder.replace(selection, newText));
};

/**
 * 主翻译逻辑
 */
const main = async () => {
  const editor = window.activeTextEditor;
  if (!editor) return;

  for (const selection of editor.selections) {
    const selected = editor.document.getText(selection);
    const isZh = isChinese(selected);
    const to = isZh ? 'en' : 'zh';
    // 获取翻译结果或直接使用原文本
    const translated: string = await getTranslation(selected, to);
    const word = isZh ? translated : selected;
    if (!word) return;

    const userSelected = await selectAndReplace(word, [{ label: translated, description: '翻译' }]);
    if (userSelected) {
      replaceTextInEditor(editor, selection, userSelected);
    }
  }
};

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
    const word = isZh ? await getTranslation(selected, 'en') : selected;
    if (word) {
      replaceTextInEditor(editor, selection, changeCase.handle(word));
    }
  }
};

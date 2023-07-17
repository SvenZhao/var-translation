/* eslint-disable no-await-in-loop */
/* eslint-disable no-useless-escape */
import { window, ExtensionContext, commands, QuickPickItem, QuickPickOptions, workspace } from "vscode";
import translatePlatforms, { EengineType } from "./inc/translate";

import {
  camelCase,
  paramCase,
  pascalCase,
  snakeCase,
  constantCase,
  capitalCase,
  dotCase,
  headerCase,
  noCase,
  pathCase,
} from "change-case";

interface IWordResult {
  engine: EengineType;
  srcText: string;
  result: string;
}
/** 翻译的内容缓存防止多次请求 */
const translateCacheWords: IWordResult[] = [];
const changeCaseMap = [
  { name: "camelCase", handle: camelCase, description: "camelCase 驼峰(小)" },
  { name: "pascalCase", handle: pascalCase, description: "pascalCase 驼峰(大)" },
  { name: "snakeCase", handle: snakeCase, description: "snakeCase 下划线" },
  { name: "paramCase", handle: paramCase, description: "paramCase 中划线(小)" },
  { name: "headerCase", handle: headerCase, description: "headerCase 中划线(大)" },
  { name: "noCase", handle: noCase, description: "noCase 分词(小)" },
  { name: "capitalCase", handle: capitalCase, description: "capitalCase 分词(大)" },
  { name: "dotCase", handle: dotCase, description: "dotCase 对象属性" },
  { name: "pathCase", handle: pathCase, description: "pathCase 文件路径" },
  { name: "constantCase", handle: constantCase, description: "constantCase 常量" },
];

const checkUpdate = async (context: ExtensionContext) => {
  const { packageJSON } = context.extension
  const { globalState } = context;
  const CACHE_KEY = `${packageJSON.name}-${packageJSON.version}`;
  const version = globalState.get(CACHE_KEY);
  const extensionVersion = packageJSON.version;
  // eslint-disable-next-line no-console
  console.log('extensionVersion', extensionVersion, version);
  const contentText = `
  ${packageJSON.displayName}更新:\r
  替换 谷歌翻译(免费爬虫 不稳定)\r
  新增 百度翻译 (手动配置token)\r
  新增 腾讯翻译 (手动配置token)\r
  新增 chatgpt翻译 (手动配置)\r
  `
  if (version !== extensionVersion) {
    globalState.update(CACHE_KEY, extensionVersion);
    window.showInformationMessage(contentText, { modal: true });
  }
}
export function activate(context: ExtensionContext) {
  checkUpdate(context);
  const translation = commands.registerCommand("extension.varTranslation", main);
  context.subscriptions.push(translation);
  changeCaseMap.forEach((item) => {
    context.subscriptions.push(
      commands.registerCommand(`extension.varTranslation.${item.name}`, () => typeTranslation(item.name))
    );
  });
}
export function deactivate() { }
/**
 * 用户选择选择转换形式
 * @param word 需要转换的单词
 * @return  用户选择
 */
async function vscodeSelect(word: string): Promise<string | undefined> {
  const items: QuickPickItem[] = changeCaseMap.map((item) => ({
    label: item.handle(word),
    description: item.description,
  }));
  const opts: QuickPickOptions = { matchOnDescription: true, placeHolder: "choose replace 选择替换" };
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
  const engine: EengineType = workspace.getConfiguration("varTranslation").translationEngine;
  const cache = translateCacheWords.find((item) => item.engine === engine && item.srcText === srcText);
  if (cache) {
    return Promise.resolve(cache.result);
  }
  const translate = translatePlatforms[engine] || translatePlatforms.google;
  // 正则快速判断英文
  if (/^[a-zA-Z\d\s\/\-\._]+$/.test(srcText)) {
    return srcText;
  }
  try {
    window.showQuickPick([{ label: "网络翻译中..." }]);
    const res = await translate(srcText, "en");
    const result = res.text;
    if (result) {
      translateCacheWords.push({ engine, srcText, result });
    }
    return result;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(error);
    window.showInformationMessage(`${engine}翻译异常,请检查网络或引擎token配置是否正确 ${JSON.stringify(error)}`);
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
  for (const selection of editor.selections) {
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
}
const typeTranslation = async (type: string) => {
  const changeCase = changeCaseMap.find((item) => item.name === type);
  if (!changeCase) {
    return;
  }
  // 获取编辑器
  const editor = window.activeTextEditor;
  if (!editor) {
    return;
  }
  // 获取选中文字
  for (const selection of editor.selections) {
    const selected = editor.document.getText(selection);
    // 获取翻译结果
    const translated = await getTranslateResult(selected);
    if (!translated) {
      return;
    }
    // 替换文案
    editor.edit((builder) => builder.replace(selection, changeCase.handle(translated)));
  }
};

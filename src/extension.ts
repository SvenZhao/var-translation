/* eslint-disable no-console */
import { window, ExtensionContext, commands, QuickPickItem, QuickPickOptions, workspace } from 'vscode';
import { google, youdao, baidu } from 'translation.js';
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
  if (!selections) return;
  return selections.label;
}

/**
 * 获取翻译引擎配置
 * @return 引擎
 */
function getEngine(translationEngine: string) {
  if (translationEngine === 'google') return google;
  if (translationEngine === 'youdao') return youdao;
  if (translationEngine === 'baidu') return baidu;
  return google;
}

async function getTranslateResult(translationEngine: string, srcText: string) {
  // 正则快速判断英文
  if (/^[a-zA-Z\d\s\-_]+$/.test(srcText)) return srcText;
  // 获取翻译引擎
  const engine = getEngine(translationEngine);

  // 判断语言
  let lang;
  const com = translationEngine === 'google';
  try {
    lang = await engine.detect({ text: srcText, com });
    console.log('判断语言成功:', lang);
  } catch (error) {
    console.log(error);
    window.showInformationMessage(`引擎:${translationEngine}异常,源语言判断失败 请检查网络重启 或 切换引擎试试`);
  }
  if (!lang) return;

  // 翻译内容
  try {
    const translationResult = await engine.translate({ text: srcText, from: lang, to: 'en', com });
    if (translationResult && translationResult.result) return translationResult.result[0];
  } catch (error) {
    console.log(error);
    window.showInformationMessage(`引擎:${translationEngine}异常,翻译失败 请检查网络重启 或 切换引擎试试`);
    return null;
  }
}

async function main() {
  // 获取引擎配置
  const { translationEngine } = workspace.getConfiguration('varTranslation');
  // 获取编辑器
  const editor = window.activeTextEditor;
  if (!editor) return;
  // 获取选中文字
  const { selection } = editor;
  const selected = editor.document.getText(selection);
  // 获取翻译结果
  const translated = await getTranslateResult(translationEngine, selected);
  if (!translated) return;
  // 组装选项
  const userSelected = await vscodeSelect(translated);
  // 用户选中
  if (!userSelected) return;
  // 替换文案
  editor.edit((builder) => builder.replace(selection, userSelected));
}

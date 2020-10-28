import { window, ExtensionContext, commands, QuickPickItem, QuickPickOptions, workspace } from 'vscode';
import { google, youdao, baidu } from 'translation.js';
import { camelCase, paramCase, pascalCase, snakeCase, constantCase } from 'change-case';

let translationEngine: string = 'google';

export function activate(context: ExtensionContext) {
  const disposable = commands.registerCommand('extension.varTranslation', vscodeTranslate);
  context.subscriptions.push(disposable);
}
export function deactivate() {}

async function vscodeTranslate() {
  const CONFIG = workspace.getConfiguration('varTranslation');
  translationEngine = CONFIG.translationEngine;
  //获取编辑器
  const editor = window.activeTextEditor;
  if (!editor) return;

  //获取选中文字
  const selection = editor.selection;
  let srcText = editor.document.getText(selection);
  const engine = getTheTranslationEngine();
  const lang = await determineLanguage(srcText, engine);
  //非英语需要翻译
  if (lang !== 'en') srcText = await getTranslateResult(engine, srcText, lang);
  console.log('srcText', srcText);
  if (!srcText) return;

  const result = await Select(srcText);
  if (!result) return;
  //替换文案
  editor.edit((builder) => builder.replace(selection, result));
}
/**
 * 用户选择选择转换形式
 * @param word 需要转换的单词
 * @return  用户选择
 */
async function Select(word: string): Promise<string | undefined> {
  var items: QuickPickItem[] = [];
  var opts: QuickPickOptions = { matchOnDescription: true, placeHolder: 'choose replace 选择替换' };
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

interface Engine {
  detect(options: any): Promise<any>;
  translate(options: any): Promise<any>;
  audio(options: any): Promise<any>;
}
/**
 * 获取翻译引擎配置
 * @return 引擎
 */
function getTheTranslationEngine() {
  let engine: Engine = google;
  if (translationEngine === 'google') {
    engine = google;
  }
  if (translationEngine === 'youdao') {
    engine = youdao;
  }
  if (translationEngine === 'baidu') {
    engine = baidu;
  }
  console.log('获取引擎:', translationEngine);
  return engine;
}
/**
 * 判断目标语言
 */
async function determineLanguage(srcText: string, engine: Engine) {
  let lang = 'en';
  //正则快速判断英文
  if (/^[a-zA-Z\d\s\-\_]+$/.test(srcText)) return lang;
  try {
    const com = translationEngine === 'google';
    lang = await engine.detect({ text: srcText, com });
    console.log('判断语言成功:', lang);
  } catch (error) {
    console.log(error);
    window.showInformationMessage(`引擎:${translationEngine}异常,源语言判断失败 请检查网络重启 或 切换引擎试试`);
  }
  return lang;
}
async function getTranslateResult(engine: Engine, srcText: string, lang: string) {
  try {
    let translationResult = null;
    const com = translationEngine === 'google';
    translationResult = await engine.translate({ text: srcText, from: lang, to: 'en', com });
    if (translationResult && translationResult.result) {
      return translationResult.result[0];
    }
  } catch (error) {
    console.log(error);
    window.showInformationMessage(`引擎:${translationEngine}异常,翻译失败 请检查网络重启 或 切换引擎试试`);
    return null;
  }
}

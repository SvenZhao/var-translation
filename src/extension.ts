import { window, ExtensionContext, commands, QuickPickItem, QuickPickOptions, workspace } from 'vscode';
import { google, youdao, baidu } from 'translation.js';
import { camelCase, paramCase, pascalCase, snakeCase, constantCase } from 'change-case';
import { TranslateResult, StringOrTranslateOptions } from 'translation.js/declaration/api/types';
const CONFIG = workspace.getConfiguration('varTranslation');
const translationEngine: string = CONFIG.translationEngine;

export function activate(context: ExtensionContext) {
	const disposable = commands.registerCommand('extension.varTranslation', vscodeTranslate);
	context.subscriptions.push(disposable);
}
export function deactivate() { }

async function vscodeTranslate() {
	//获取编辑器
	const editor = window.activeTextEditor;
	if (!editor) { return; }
	//获取选中文字
	const selection = editor.selection;
	let srcText = editor.document.getText(selection);
	if (!srcText) { return; }
	try {
		const engine = getTheTranslationEngine();
		const lang = await determineLanguage(srcText, engine);
		//非英语需要翻译
		if (lang !== 'en') {
			const translationResult: TranslateResult = await translate(engine, srcText, lang);
			if (translationResult && translationResult.result) { srcText = translationResult.result[0]; }
			console.log(translationResult);
		}
		const result = await Select(srcText);
		if (!result) { return; }
		//替换文案
		editor.edit(builder => builder.replace(selection, result));
	}
	catch (err) {
		window.showInformationMessage('some thing error; maybe Network Error');
	}
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
	if (!selections) { return; }
	return selections.label;
}

interface Engine {
	detect(options: StringOrTranslateOptions): Promise<any>;
	translate(options: StringOrTranslateOptions): Promise<any>;
	audio(options: StringOrTranslateOptions): Promise<any>;
}
/**
 * 获取翻译引擎配置
 * @return 引擎
 */
function getTheTranslationEngine() {
	let engine: Engine = google;
	if (translationEngine === 'google') { engine = google; }
	if (translationEngine === 'youdao') { engine = youdao; }
	if (translationEngine === 'baidu') { engine = baidu; }
	return engine;
}
/**
 * 获取翻译引擎配置
 * @return 引擎
 */
async function determineLanguage(srcText: string, engine: Engine) {
	let lang: string;
	if (translationEngine === 'google') { lang = await engine.detect({ text: srcText, com: true }); }
	else { lang = await engine.detect(srcText); }
	return lang;
}
async function translate(engine: Engine, srcText: string, lang: string) {
	if (translationEngine === 'google') { return engine.translate({ text: srcText, from: lang, to: 'en', com: true }); }
	return engine.translate({ text: srcText, from: lang, to: 'en' });
}
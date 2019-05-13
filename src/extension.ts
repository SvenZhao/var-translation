import { window, ExtensionContext, commands, QuickPickItem, QuickPickOptions, workspace } from 'vscode';
import { google, youdao, baidu } from 'translation.js';
import { camelCase, paramCase, pascalCase, snakeCase, constantCase } from 'change-case';
import { TranslateResult } from 'translation.js/declaration/api/types';

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
		const lang = await engine.detect(srcText);
		//非英语需要翻译
		if (lang !== 'en') {
			const translationResult: TranslateResult = await engine.translate({ text: srcText, from: lang, to: 'en' });
			if (translationResult && translationResult.result) { srcText = translationResult.result[0]; }
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
 * 获取用户选择结果
 * @param {string}word 需要转换的单词 
 * @return {string}转换结果
 */
async function Select(word: string) {
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
/**
 * 获取翻译引擎配置
 */
function getTheTranslationEngine() {
	const CONFIG = workspace.getConfiguration('varTranslation');
	const translationEngine = CONFIG.translationEngine;
	if (translationEngine === 'google') { return google; }
	if (translationEngine === 'youdao') { return youdao; }
	if (translationEngine === 'baidu') { return baidu; }
	return google;
}
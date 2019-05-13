import { window, ExtensionContext, commands, QuickPickItem, QuickPickOptions, workspace } from 'vscode';
import { google, youdao, baidu } from 'translation.js';
import { camelCase, paramCase, pascalCase, snakeCase, constantCase } from 'change-case';

export function activate(context: ExtensionContext) {
	const disposable = commands.registerCommand('extension.varTranslation', vscodeTranslate);
	context.subscriptions.push(disposable);
}

export function deactivate() { }
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
async function vscodeTranslate() {
	const editor = window.activeTextEditor;
	if (!editor) { return; }
	const selection = editor.selection;
	let srcText = editor.document.getText(selection);
	if (!srcText) { return; }
	let result: any;

	try {
		const engine = getTheTranslationEngine();
		const lang = await engine.detect(srcText);
		// 检查英语跳过
		if (lang !== 'en') {
			//	翻译内容
			result = await engine.translate({ text: srcText, from: lang, to: 'en' });
			result = String(result.result[0]);
		} else { result = srcText; }
		result = await Select(result);
		if (!result) { return; }
		//替换文案
		editor.edit(builder => builder.replace(selection, result));
	}
	catch (err) {
		window.showInformationMessage('some thing error; maybe Network Error');
	}
}
async function Select(result: string) {
	var items: QuickPickItem[] = [];
	var opts: QuickPickOptions = { matchOnDescription: true, placeHolder: 'choose replace 选择替换' };
	items.push({ label: camelCase(result), description: 'camelCase 小驼峰' });
	items.push({ label: pascalCase(result), description: 'pascalCase 大驼峰' });
	items.push({ label: snakeCase(result), description: 'snakeCase 下划线' });
	items.push({ label: paramCase(result), description: 'paramCase 中划线' });
	items.push({ label: constantCase(result), description: 'constantCase 常量' });
	const selections = await window.showQuickPick(items, opts);
	if (!selections) { return; }
	return selections.label;
}

import { window, ExtensionContext, commands, QuickPickItem, QuickPickOptions, Selection } from 'vscode';
import { google } from 'translation.js';
export function activate(context: ExtensionContext) {
	const disposable = commands.registerCommand('extension.vscodeTranslate', vscodeTranslate);
	context.subscriptions.push(disposable);
}

export function deactivate() { }
async function vscodeTranslate() {
	const editor = window.activeTextEditor;
	if (!editor) { return; }
	const selection = editor.selection;
	let srcText = editor.document.getText(selection);
	if (!srcText) { return; }
	let result: any;
	// 检查英语跳过
	const lang = await google.detect(srcText);
	if (lang === 'en') { return window.showInformationMessage('Translation of the target language is not supported'); }
	//	翻译内容
	result = await google.translate({ text: srcText, from: lang, to: 'en' });
	result = String(result.result[0]);
	result = new Result(result);
	result = await Select(result);
	//替换文案
	editor.edit(builder => builder.replace(selection, result));
}
async function Select(result: Result) {
	var items: QuickPickItem[] = [];
	var opts: QuickPickOptions = { matchOnDescription: true, placeHolder: 'choose replace' };
	items.push({ label: result.camel(false), description: 'lowerCamelCase' });
	items.push({ label: result.underLine(), description: 'underLine' });
	items.push({ label: result.camel(true), description: 'UpperCamelCase' });
	items.push({ label: result.lineThrough(), description: 'lineThrough' });
	const selections = await window.showQuickPick(items, opts);
	if (!selections) { return; }
	return selections.label;
}
class Result {
	result: Array<string>;
	constructor(result: string) {
		this.result = this.init(result);
	}
	init(result: string): Array<string> {
		return result.toLowerCase().split(' ');
	}
	camel(type: boolean): string {
		return this.result.reduce((previousValue: string, currentValue: string, currentIndex: number) => {
			if (currentIndex !== 0 || (currentIndex === 0 && type)) { currentValue = currentValue.replace(/^\w/, word => word.toUpperCase()); }
			return previousValue + currentValue;
		}, '');
	}
	lineThrough(): string {
		return this.result.join('-');
	}
	underLine(): string {
		return this.result.join('_');
	}
}
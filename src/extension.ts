import { window, ExtensionContext, commands, QuickPickItem, QuickPickOptions, Selection } from 'vscode';
import { google } from 'translation.js';
export function activate(context: ExtensionContext) {
	const disposable = commands.registerCommand('extension.vscodeTranslate', vscodeTranslate);
	context.subscriptions.push(disposable);
}

export function deactivate() { }
async function vscodeTranslate() {
	const editor = window.activeTextEditor;
	if (!editor) { return console.log('no open text editor!'); }
	const selection = editor.selection;
	let srcText = editor.document.getText(selection);
	if (!srcText) { return; }
	let result: any;
	result = await google.translate(srcText);
	result = String(result.result[0]);
	result = new Result(result);
	result = await Select(result);
	editor.edit(builder => {
		builder.replace(selection, result);
	});
}
async function Select(result: Result) {
	var items: QuickPickItem[] = [];
	var opts: QuickPickOptions = { matchOnDescription: true, placeHolder: 'test info :' };
	items.push({ label: result.camel(false) });
	items.push({ label: result.camel(true) });
	items.push({ label: result.underLine() });
	items.push({ label: result.lineThrough() });
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
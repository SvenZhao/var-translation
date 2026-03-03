import { window, ExtensionContext, commands, QuickPickItem, Selection, workspace } from 'vscode';
import { changeCaseMap } from './utils';
import AsyncQuickPick from './utils/asyncPick';
import VarTranslate from './translate';
import { migrateOldConfig } from './config/migration';
import { configEngineGuide } from './config/configGuide';
import { TranslateLogger } from './translate/logger';
import { t } from './i18n';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const vscodeModule = require('vscode');


export let packageJSON: any;
const varTranslate = new VarTranslate()

const checkUpdate = async (context: ExtensionContext) => {
  const versionKey = `${packageJSON.name}.lastVersion`;
  const lastVersion = context.globalState.get<string>(versionKey);
  const currentVersion: string = packageJSON.version;

  if (lastVersion === currentVersion) {
    return;
  }

  context.globalState.update(versionKey, currentVersion);

  // 首次安装不弹窗
  if (!lastVersion) {
    return;
  }

  const changelogUrl = packageJSON.repository?.url
    ? `${packageJSON.repository.url.replace(/\.git$/, '')}/blob/master/CHANGELOG.md`
    : '';

  const action = await window.showInformationMessage(
    `${packageJSON.displayName} 已更新到 v${currentVersion}`,
    '查看更新日志',
    '关闭'
  );

  if (action === '查看更新日志' && changelogUrl) {
    commands.executeCommand('vscode.open', vscodeModule.Uri.parse(changelogUrl));
  }
};

export function activate(context: ExtensionContext) {
  packageJSON = context.extension.packageJSON;
  migrateOldConfig(context);
  checkUpdate(context);
  context.subscriptions.push(commands.registerCommand('extension.varTranslation', main));
  context.subscriptions.push(commands.registerCommand('extension.varTranslation.selectCopilotModel', selectCopilotModel));
  context.subscriptions.push(commands.registerCommand('extension.varTranslation.configEngine', configEngineGuide));
  changeCaseMap.forEach((item) => {
    context.subscriptions.push(commands.registerCommand(`extension.varTranslation.${item.name}`, () => typeTranslation(item.name)));
  });
}

export function deactivate() {
  TranslateLogger.dispose();
}

/**
 * 执行选择替换操作
 * @param word 需要处理的单词
 * @param quickPickItems 可选的快速选择项
 * @returns 用户选择的文本
 */
const quickPick = new AsyncQuickPick();
const selectAndReplace = async (word: string, quickPickItems: QuickPickItem[] = [], async?: boolean): Promise<string | undefined> => {
  const wordItems = changeCaseMap.map((item) => ({ label: item.handle(word), description: item.description }));
  const items: QuickPickItem[] = [...wordItems, ...quickPickItems];
  return quickPick.showQuickPick(items, async)
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

/** 展示用户选择框 */
const showSelectAndReplace = async (selection: Selection, selected: string) => {
  const editor = window.activeTextEditor;
  if (!editor) return;
  const handleReplace = async (userSelected: string | undefined) => {
    if (userSelected) {
      replaceTextInEditor(editor, selection, userSelected);
    }
  };
  /* 更新需要翻译的词 */
  varTranslate.setText(selected);
  const isEn = varTranslate.isEnglish;
  /* 非英文（如中文）需要先翻译成英文再转换 */
  if (!isEn) {
    const translated = await varTranslate.translate();
    selectAndReplace(translated, [{ label: translated, description: '翻译' }]).then(handleReplace);
  } else {
    /* 英文先出格式转换 再异步等结果 */
    selectAndReplace(selected, [{ label: '正在翻译中', description: '翻译' }]).then(handleReplace);
    const translated = await varTranslate.translate();
    selectAndReplace(selected, [{ label: translated, description: '翻译' }]).then(handleReplace);
  }
};

/**
 * 主翻译逻辑
 */
const main = async () => {
  const editor = window.activeTextEditor;
  if (!editor) return;
  for (const selection of editor.selections) {
    const selected = editor.document.getText(selection);
    showSelectAndReplace(selection, selected);
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
    varTranslate.setText(selected);
    const isEn = varTranslate.isEnglish;
    const word = !isEn ? await varTranslate.translate() : selected;
    if (word) {
      replaceTextInEditor(editor, selection, changeCase.handle(word));
    }
  }
};

/**
 * 自动获取 Copilot 模型列表供用户选择
 */
async function selectCopilotModel() {
  try {
    if (typeof vscodeModule.lm === 'undefined') {
      window.showErrorMessage(t('copilot.notSupported'));
      return;
    }

    const models = await vscodeModule.lm.selectChatModels();
    if (!models || models.length === 0) {
      window.showErrorMessage(t('copilot.noModels'));
      return;
    }

    const items: QuickPickItem[] = models.map((m: any) => ({
      label: m.name || m.id,
      description: `${m.vendor} - ${m.family}`,
      detail: m.id,
    }));

    const selected = await window.showQuickPick(items, {
      placeHolder: t('copilot.selectModel'),
      title: t('copilot.selectTitle'),
    });

    if (selected) {
      await workspace.getConfiguration('varTranslation').update('copilot.model', selected.detail, true);
      window.showInformationMessage(t('copilot.modelSet', { model: selected.label }));
    }
  } catch (error: any) {
    window.showErrorMessage(t('copilot.fetchFailed', { message: error.message }));
  }
}

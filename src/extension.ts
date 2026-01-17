import { window, ExtensionContext, commands, QuickPickItem, Selection, lm, workspace } from 'vscode';
import { changeCaseMap } from './utils';
import AsyncQuickPick from './utils/asyncPick';
import VarTranslate from './translate';


export let packageJSON: any;
const varTranslate = new VarTranslate()

const checkUpdate = async (context: ExtensionContext) => {
  const { globalState } = context;
  const CACHE_KEY_PREFIX = `${packageJSON.name}-version`;
  const lastCheckedVersion = globalState.get<string>(CACHE_KEY_PREFIX);
  const currentVersion = packageJSON.version;
  if (lastCheckedVersion !== currentVersion) {
    globalState.update(CACHE_KEY_PREFIX, currentVersion);

    const updateContent = `
   **${packageJSON.displayName} 更新**:
    - 异步英汉优化互译响应 提高直接转换的使用体验
    - 修复英文单词缓存
    `;
    window.showInformationMessage(updateContent)
  }
};

export function activate(context: ExtensionContext) {
  packageJSON = context.extension.packageJSON;
  checkUpdate(context);
  context.subscriptions.push(commands.registerCommand('extension.varTranslation', main));
  context.subscriptions.push(commands.registerCommand('extension.varTranslation.selectCopilotModel', selectCopilotModel));
  changeCaseMap.forEach((item) => {
    context.subscriptions.push(commands.registerCommand(`extension.varTranslation.${item.name}`, () => typeTranslation(item.name)));
  });
}

export function deactivate() { }

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
  const isZh = varTranslate.isChinese;
  /* 中文情况下 需要先翻译成英文 再转换 */
  if (isZh) {
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
    const isZh = varTranslate.isChinese;
    const word = isZh ? await varTranslate.translate() : selected;
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
    // @ts-ignore
    if (typeof lm === 'undefined') {
      window.showErrorMessage('当前 VS Code 版本不支持 Copilot API');
      return;
    }

    // @ts-ignore
    const models = await lm.selectChatModels();
    if (!models || models.length === 0) {
      window.showErrorMessage('未找到可用的 Copilot 模型，请确保已安装 GitHub Copilot 扩展并已登录');
      return;
    }

    const items = models.map((m: any) => ({
      label: m.name || m.id,
      description: `${m.vendor} - ${m.family}`,
      detail: m.id,
    }));

    const selected = await window.showQuickPick(items, {
      placeHolder: '请选择用于翻译的 Copilot 模型',
      title: '选择 Copilot 模型',
    });

    if (selected) {
      await workspace.getConfiguration('varTranslation').update('copilot.model', selected.detail, true);
      window.showInformationMessage(`已设置 Copilot 翻译模型为: ${selected.label}`);
    }
  } catch (error: any) {
    window.showErrorMessage(`获取模型列表失败: ${error.message}`);
  }
}

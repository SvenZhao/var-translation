import * as vscode from 'vscode';
import { window, ExtensionContext, commands, QuickPickItem, Selection, workspace, StatusBarAlignment, Uri } from 'vscode';
import { changeCaseMap } from './utils';
import AsyncQuickPick from './utils/asyncPick';
import VarTranslate from './translate';
import { migrateOldConfig } from './config/migration';
import { configEngineGuide } from './config/configGuide';
import { TranslateLogger } from './translate/logger';
import { initCache, getHistory, clearCache } from './translate/cache';
import { t } from './i18n';
import { EengineType } from './translate/engines';
import { fileNameTranslator } from './translate/fileNameTranslator';


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
    commands.executeCommand('vscode.open', Uri.parse(changelogUrl));
  }
};

const ENGINE_LABELS: Record<string, string> = {
  [EengineType.copilot]: 'Copilot',
  [EengineType.ChatGpt]: 'ChatGPT',
  [EengineType.google]: 'Google',
  [EengineType.bing]: 'Bing',
  [EengineType.deeplx]: 'DeepLX',
  [EengineType.baidu]: '百度',
  [EengineType.tencent]: '腾讯',
  [EengineType.libretranslate]: 'LibreTranslate',
};

let engineStatusBar: ReturnType<typeof window.createStatusBarItem>;

function createEngineStatusBar(context: ExtensionContext) {
  engineStatusBar = window.createStatusBarItem(StatusBarAlignment.Right, 100);
  engineStatusBar.command = 'extension.varTranslation.switchEngine';
  updateEngineStatusBar();
  engineStatusBar.show();
  context.subscriptions.push(engineStatusBar);

  context.subscriptions.push(
    workspace.onDidChangeConfiguration((event) => {
      if (event.affectsConfiguration('varTranslation.translationEngine')) {
        updateEngineStatusBar();
      }
    })
  );
}

function updateEngineStatusBar() {
  const config = workspace.getConfiguration('varTranslation');
  const engineType = config.get<string>('translationEngine') || EengineType.google;
  const label = ENGINE_LABELS[engineType] || engineType;
  engineStatusBar.text = `$(globe) ${label}`;
  engineStatusBar.tooltip = '点击切换翻译引擎';
}

interface EngineQuickPickItem extends QuickPickItem {
  value: string;
}

async function switchEngine() {
  const items: EngineQuickPickItem[] = Object.entries(ENGINE_LABELS).map(([value, label]) => ({
    label,
    value,
    picked: value === (workspace.getConfiguration('varTranslation').get<string>('translationEngine') || EengineType.google),
  }));

  const selected = await window.showQuickPick(items, {
    placeHolder: '选择翻译引擎',
    title: '切换翻译引擎',
  });

  if (selected) {
    await workspace.getConfiguration('varTranslation').update('translationEngine', selected.value, true);
    window.showInformationMessage(`翻译引擎已切换为 ${selected.label}`);
  }
}

async function showTranslateHistory() {
  const history = getHistory();
  if (history.length === 0) {
    window.showInformationMessage('暂无翻译历史');
    return;
  }

  const items: QuickPickItem[] = history.slice(0, 100).map((entry) => ({
    label: `${entry.source} → ${entry.target}`,
    description: `${ENGINE_LABELS[entry.engine] || entry.engine} | ${entry.targetLang}`,
    detail: new Date(entry.timestamp).toLocaleString(),
  }));

  const selected = await window.showQuickPick(items, {
    placeHolder: '选择历史记录插入到编辑器',
    title: '翻译历史',
  });

  if (selected) {
    const editor = window.activeTextEditor;
    if (editor) {
      const target = selected.label.split(' → ')[1];
      editor.edit((builder) => {
        for (const selection of editor.selections) {
          builder.replace(selection, target);
        }
      });
    }
  }
}

/**
 * 从当前上下文解析要处理的文件 URI
 * 快捷键无参数时，依次尝试：活动编辑器 → 最近 Tab
 */
function resolveFileFromContext(): Uri | undefined {
  // 1. 当前激活的编辑器
  const editor = window.activeTextEditor;
  if (editor?.document.uri) {
    return editor.document.uri;
  }
  // 2. 从最近的活动 Tab 获取
  const activeTab = window.tabGroups.activeTabGroup.activeTab;
  const tabInput = activeTab?.input as { uri?: Uri } | undefined;
  if (tabInput?.uri?.fsPath) {
    return tabInput.uri;
  }
  return undefined;
}

export function activate(context: ExtensionContext) {
  packageJSON = context.extension.packageJSON;
  initCache(context);
  migrateOldConfig(context);
  checkUpdate(context);
  createEngineStatusBar(context);

  // 翻译文件名（右键 Explorer / 快捷键）
  context.subscriptions.push(commands.registerCommand('extension.varTranslation.translateFileName', (uri?: Uri) => {
    if (uri?.fsPath) {
      void fileNameTranslator.translateFile(uri);
      return;
    }
    // 快捷键：从当前编辑器或 Tab 获取文件
    const file = resolveFileFromContext();
    if (file) {
      void fileNameTranslator.translateFile(file);
    } else {
      window.showInformationMessage('请打开文件后按快捷键，或在资源管理器中右键 → 驼峰翻译');
    }
  }));

  // 驼峰命名转换：编辑器模式 & 文件模式
  context.subscriptions.push(commands.registerCommand('extension.varTranslation', (uri?: Uri) => {
    if (uri?.fsPath) {
      // 右键菜单触发（explorer/context）→ 文件模式
      void fileNameTranslator.translateFile(uri);
      return;
    }

    // 编辑器模式：有选中文本 → 文本翻译
    if (window.activeTextEditor && !window.activeTextEditor.selection.isEmpty) {
      main();
      return;
    }

    // 编辑器模式：无选中文本 → 提示
    if (window.activeTextEditor) {
      window.showInformationMessage('请先在编辑器中选中要翻译的文本');
      return;
    }

    // 无活跃编辑器时，尝试从 Tab 获取文件
    const file = resolveFileFromContext();
    if (file) {
      void fileNameTranslator.translateFile(file);
    } else {
      window.showInformationMessage('请打开文件后按快捷键，或在资源管理器中右键 → 驼峰翻译');
    }
  }));
  context.subscriptions.push(commands.registerCommand('extension.varTranslation.selectCopilotModel', selectCopilotModel));
  context.subscriptions.push(commands.registerCommand('extension.varTranslation.configEngine', configEngineGuide));
  context.subscriptions.push(commands.registerCommand('extension.varTranslation.switchEngine', switchEngine));
  context.subscriptions.push(commands.registerCommand('extension.varTranslation.history', showTranslateHistory));
  context.subscriptions.push(commands.registerCommand('extension.varTranslation.clearCache', () => {
    clearCache();
    window.showInformationMessage('翻译缓存已清空');
  }));

  changeCaseMap.forEach((item) => {
    // 编辑器模式：编辑器中选中文本转换。忽略 uri 参数，防止 VS Code 在编辑器右键
    // 菜单传入当前文档 uri 而误走文件翻译路径（issue #97）
    context.subscriptions.push(commands.registerCommand(`extension.varTranslation.${item.name}`, () => {
      typeTranslation(item.name);
    }));
    // 文件模式：资源管理器右键重命名文件/目录
    context.subscriptions.push(commands.registerCommand(`extension.varTranslation.translateFileName.${item.name}`, (uri?: Uri) => {
      if (uri?.fsPath) {
        void fileNameTranslator.translateFile(uri, item.name);
      }
    }));
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
    if (typeof (vscode as any).lm === 'undefined') {
      window.showErrorMessage(t('copilot.notSupported'));
      return;
    }

    const models = await (vscode as any).lm.selectChatModels();
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

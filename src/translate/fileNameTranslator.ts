import { basename, dirname, extname, join, relative } from 'path';
import { Uri, window, workspace, QuickPickItem, FileType, WorkspaceEdit } from 'vscode';
import { changeCaseMap } from '../utils';
import VarTranslator from './index';
import AsyncQuickPick from '../utils/asyncPick';

/**
 * 文件名翻译器
 * 复用跟文本翻译完全相同的 QuickPick 流程（changeCaseMap + 翻译选项），
 * 只是数据源从"编辑器选中文本"变成"文件名"，落点从"替换文本"变成"重命名文件"
 */
export class FileNameTranslator {
  private varTranslate = new VarTranslator();
  private quickPick = new AsyncQuickPick();

  /**
   * 检查文件名是否有真正的扩展名（排除 .eslintrc 这种 dotfile）
   */
  private hasRealExtension(fileName: string): boolean {
    const ext = extname(fileName);
    return ext !== '' && ext !== fileName;
  }

  /**
   * 弹出格式选择 QuickPick（与文本翻译的 selectAndReplace 逻辑一致）
   * 排除 pathCase（产生 / 路径分隔符）和 dotCase（产生 .）等不适合文件名的格式
   */
  private async showFormatPick(word: string, extraItems: QuickPickItem[] = []): Promise<string | undefined> {
    const wordItems: QuickPickItem[] = changeCaseMap
      .filter((item) => item.name !== 'pathCase' && item.name !== 'dotCase')
      .map((item) => ({
        label: item.handle(word),
        description: item.description,
      }));
    const items: QuickPickItem[] = [...wordItems, ...extraItems];
    return this.quickPick.showQuickPick(items);
  }

  /**
   * 翻译并重命名文件/目录
   * @param file 文件/目录 URI
   * @param format 可选，指定格式名则直接应用，不弹 QuickPick
   */
  async translateFile(file: Uri, format?: string): Promise<void> {
    const workspaceFolder = workspace.getWorkspaceFolder(file);
    if (!workspaceFolder) {
      window.showWarningMessage('文件不在工作区内');
      return;
    }

    const relativePath = relative(workspaceFolder.uri.fsPath, file.fsPath);
    const parentPath = dirname(relativePath);

    // 判断是文件还是目录
    let isDirectory = false;
    try {
      const stat = await workspace.fs.stat(file);
      isDirectory = (stat.type & FileType.Directory) !== 0;
    } catch { /* 忽略 */ }

    // 取出 basename（文件名或目录名）
    const rawName = basename(relativePath);

    // 解析扩展名和点前缀（dotfile 如 .npmignore 需要保留前导点）
    let ext = '';
    let dotPrefix = '';
    let namePart = rawName;
    if (!isDirectory) {
      if (this.hasRealExtension(rawName)) {
        ext = extname(rawName);
        namePart = rawName.slice(0, -ext.length);
      } else if (rawName.startsWith('.')) {
        // dotfile：前导点是名字的一部分，不要被 change-case 吃掉
        dotPrefix = '.';
        namePart = rawName.slice(1);
      }
    }

    // === 跟文本翻译一样的流程：先翻译 → 弹 QuickPick（格式 + 翻译结果）===
    this.varTranslate.setText(namePart);
    const word = this.varTranslate.isEnglish ? namePart : await this.varTranslate.translate();
    const translated = this.varTranslate.isEnglish ? await this.varTranslate.translate() : word;

    // 如果指定了直接格式，不走 QuickPick
    if (format) {
      const changeCase = changeCaseMap.find((item) => item.name === format);
      if (changeCase) {
        const newName = dotPrefix + changeCase.handle(word) + ext;
        await this.doRename(file, workspaceFolder.uri.fsPath, parentPath, rawName, newName);
      }
      return;
    }

    // 弹 QuickPick：格式选项 + 翻译结果（dotfile 的 . 前缀单独保留）
    const selected = await this.showFormatPick(namePart, [
      { label: translated, description: '翻译' },
    ]);
    if (!selected) return;

    // 如果选了"翻译"选项，用翻译结果；否则用选中的格式结果
    const result = selected === translated ? translated : selected;
    await this.doRename(
      file, workspaceFolder.uri.fsPath, parentPath, rawName,
      dotPrefix + result + ext
    );
  }

  /**
   * 执行重命名（使用 WorkspaceEdit 以支持 Cmd+Z 撤销）
   */
  private async doRename(file: Uri, workspaceRoot: string, parentPath: string, oldName: string, newName: string): Promise<void> {
    const newRelative = parentPath === '.' ? newName : join(parentPath, newName);
    const newFilePath = Uri.file(join(workspaceRoot, newRelative));

    const edit = new WorkspaceEdit();
    edit.renameFile(file, newFilePath, { overwrite: false });

    try {
      const applied = await workspace.applyEdit(edit);
      if (applied) {
        window.showInformationMessage(`已重命名: ${oldName} → ${newName}`);
      } else {
        // applyEdit 返回 false，说明目标已存在或操作失败
        const exists = await workspace.fs.stat(newFilePath).then(() => true, () => false);
        if (exists) {
          window.showErrorMessage(`重命名失败: ${newName} 已存在`);
        } else {
          window.showErrorMessage('重命名失败');
        }
      }
    } catch (err: any) {
      window.showErrorMessage(`重命名失败: ${err.message || err}`);
    }
  }
}

export const fileNameTranslator = new FileNameTranslator();

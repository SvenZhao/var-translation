import { camelCase, pascalCase, snakeCase, paramCase, constantCase, headerCase, capitalCase, noCase, dotCase, pathCase } from 'change-case';
import { basename, dirname, extname, join, relative } from 'path';
import { Uri, window, workspace } from 'vscode';
import { isChinese } from '../utils';
import VarTranslator from './index';

/**
 * 文件名翻译器
 * 驼峰翻译的文件模式：对资源管理器中的文件进行翻译+命名格式转换
 */
export class FileNameTranslator {
  private varTranslate = new VarTranslator();

  /**
   * 翻译文件名中的中文部分
   */
  private async translateText(text: string): Promise<string> {
    this.varTranslate.setText(text);
    if (this.varTranslate.isEnglish) {
      return text;
    }
    try {
      const translated = await this.varTranslate.translate();
      return translated || text;
    } catch {
      return text;
    }
  }

  /**
   * 命名格式映射，复用 utils 中的命名
   */
  private readonly formatMap: Record<string, (str: string) => string> = {
    camelCase,
    pascalCase,
    snakeCase,
    paramCase,
    constantCase,
    headerCase,
    capitalCase,
    noCase,
    dotCase,
    pathCase,
  };

  /**
   * 生成多种命名格式选项
   */
  private generateFormats(translatedName: string, ext: string, keepLabel: string): Array<{ label: string; description: string; path: string }> {
    const pathParts = translatedName.split(/[\/\\]/);
    const formats: Array<{ label: string; description: string; path: string }> = [];

    const applyFormat = (formatter: (str: string) => string, description: string) => {
      const formattedParts = pathParts.map((part) => {
        if (part.includes('.')) {
          return part.split('.').map((s) => formatter(s)).join('.');
        }
        return formatter(part);
      });
      formats.push({
        label: formattedParts.join('/') + ext,
        description,
        path: formattedParts.join('/') + ext,
      });
    };

    applyFormat(camelCase, 'camelCase 小驼峰');
    applyFormat(pascalCase, 'PascalCase 大驼峰');
    applyFormat(snakeCase, 'snake_case 下划线');
    applyFormat(paramCase, 'kebab-case 短横线');
    applyFormat(constantCase, 'CONSTANT_CASE 常量');
    applyFormat(headerCase, 'Header-Case 短横大写');
    applyFormat(capitalCase, 'Capital Case 分词大写');
    applyFormat(noCase, 'no case 分词小写');

    formats.push({ label: keepLabel, description: '保持原文件名', path: '' });

    return formats;
  }

  /**
   * 翻译并重命名文件
   * @param file 文件 URI
   * @param format 可选的格式名，如果指定则直接应用该格式，否则弹出 QuickPick
   */
  async translateFile(file: Uri, format?: string): Promise<void> {
    const workspaceFolder = workspace.getWorkspaceFolder(file);
    if (!workspaceFolder) {
      window.showWarningMessage('文件不在工作区内');
      return;
    }

    const relativePath = relative(workspaceFolder.uri.fsPath, file.fsPath);

    // 检查是否包含中文
    if (!isChinese(relativePath)) {
      window.showInformationMessage('文件名不包含中文，无需翻译');
      return;
    }

    const ext = extname(relativePath);
    const nameWithoutExt = relativePath.slice(0, -ext.length);

    // 逐部分翻译路径
    const parts = nameWithoutExt.split(/[\/\\]/);
    const translatedParts: string[] = [];

    for (const part of parts) {
      if (!part) continue;
      const translated = await this.translateText(part);
      translatedParts.push(translated);
    }

    const translatedName = translatedParts.join('/');

    // 如果指定了格式，直接应用
    if (format && this.formatMap[format]) {
      const formatter = this.formatMap[format];
      const newParts = translatedName.split(/[\/\\]/).map((part) => {
        if (part.includes('.')) {
          return part.split('.').map((s) => formatter(s)).join('.');
        }
        return formatter(part);
      });
      const newRelativePath = newParts.join('/') + ext;
      const newFilePath = join(workspaceFolder.uri.fsPath, newRelativePath);

      await workspace.fs.createDirectory(Uri.file(dirname(newFilePath)));
      await workspace.fs.rename(file, Uri.file(newFilePath));
      window.showInformationMessage(`已重命名: ${relativePath} → ${newRelativePath}`);
      return;
    }

    // 未指定格式，弹出 QuickPick
    const formats = this.generateFormats(translatedName, ext, basename(relativePath));

    const selected = await window.showQuickPick(formats, {
      placeHolder: '选择命名格式：',
      title: `翻译文件名: ${basename(relativePath)}`,
      ignoreFocusOut: true,
    });

    if (!selected || !selected.path) {
      return; // 取消或保持原文件名
    }

    const newFilePath = join(workspaceFolder.uri.fsPath, selected.path);
    await workspace.fs.createDirectory(Uri.file(dirname(newFilePath)));
    await workspace.fs.rename(file, Uri.file(newFilePath));
    window.showInformationMessage(`已重命名: ${relativePath} → ${selected.path}`);
  }
}

export const fileNameTranslator = new FileNameTranslator();

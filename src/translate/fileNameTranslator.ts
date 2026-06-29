import { camelCase, pascalCase, snakeCase, paramCase, constantCase, headerCase, capitalCase, noCase } from 'change-case';
import { basename, dirname, extname, join, relative } from 'path';
import { Uri, window, workspace, FileType } from 'vscode';
import { isChinese } from '../utils';
import VarTranslator from './index';

/**
 * 文件名翻译器
 * 驼峰翻译的文件模式：对资源管理器中的文件/目录进行翻译+命名格式转换
 * 只处理 basename（文件名或目录名），不影响父路径
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
   * 命名格式映射
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
  };

  /**
   * 判断 basename 是否有真正的扩展名（排除 .eslintrc 这种 dotfile）
   */
  private hasRealExtension(fileName: string): boolean {
    const ext = extname(fileName);
    return ext !== '' && ext !== fileName;
  }

  /**
   * 对单个名字应用格式转换（处理内部点号如 hello.world）
   */
  private applyFormatToName(name: string, formatter: (str: string) => string): string {
    if (name.includes('.')) {
      return name.split('.').map((s) => formatter(s)).join('.');
    }
    return formatter(name);
  }

  /**
   * 生成多种命名格式选项
   */
  private generateFormats(baseName: string, ext: string, keepLabel: string): Array<{ label: string; description: string; name: string }> {
    const formats: Array<{ label: string; description: string; name: string }> = [];

    const addFormat = (formatter: (str: string) => string, description: string) => {
      const formatted = this.applyFormatToName(baseName, formatter);
      formats.push({ label: formatted + ext, description, name: formatted + ext });
    };

    addFormat(camelCase, 'camelCase 小驼峰');
    addFormat(pascalCase, 'PascalCase 大驼峰');
    addFormat(snakeCase, 'snake_case 下划线');
    addFormat(paramCase, 'kebab-case 短横线');
    addFormat(constantCase, 'CONSTANT_CASE 常量');
    addFormat(headerCase, 'Header-Case 短横大写');
    addFormat(capitalCase, 'Capital Case 分词大写');
    addFormat(noCase, 'no case 分词小写');

    formats.push({ label: keepLabel, description: '保持原文件名', name: '' });

    return formats;
  }

  /**
   * 翻译并重命名文件或目录
   * @param file 文件/目录 URI
   * @param format 可选的格式名，如果指定则直接应用该格式，否则弹出 QuickPick
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
    } catch {
      // stat 失败，按文件处理
    }

    // 取出 basename（文件名或目录名）
    const rawName = basename(relativePath);

    // dotfile 没有真正的扩展名（如 .eslintrc, .editorconfig）
    let ext = '';
    let nameWithoutExt = rawName;
    if (!isDirectory && this.hasRealExtension(rawName)) {
      ext = extname(rawName);
      nameWithoutExt = rawName.slice(0, -ext.length);
    }

    // 检查是否包含中文
    const hasChinese = isChinese(rawName);

    // 翻译（如果需要） + 格式转换
    let baseName: string;
    if (hasChinese) {
      baseName = await this.translateText(nameWithoutExt);
    } else {
      baseName = nameWithoutExt;
    }

    // 如果指定了格式，直接应用
    if (format && this.formatMap[format]) {
      const formatter = this.formatMap[format];
      const newName = this.applyFormatToName(baseName, formatter) + ext;
      const newPath = parentPath === '.' ? newName : join(parentPath, newName);
      const newFilePath = join(workspaceFolder.uri.fsPath, newPath);

      try {
        await workspace.fs.rename(file, Uri.file(newFilePath), { overwrite: false });
        window.showInformationMessage(`已重命名: ${rawName} → ${newName}`);
      } catch (err: any) {
        window.showErrorMessage(`重命名失败: ${err.message || err}`);
      }
      return;
    }

    // 未指定格式，弹出 QuickPick
    const formats = this.generateFormats(baseName, ext, rawName);

    const selected = await window.showQuickPick(formats, {
      placeHolder: '选择命名格式：',
      title: `驼峰翻译: ${rawName}`,
      ignoreFocusOut: true,
    });

    if (!selected || !selected.name) {
      return; // 取消或保持原文件名
    }

    const newPath = parentPath === '.' ? selected.name : join(parentPath, selected.name);
    const newFilePath = join(workspaceFolder.uri.fsPath, newPath);

    try {
      await workspace.fs.rename(file, Uri.file(newFilePath), { overwrite: false });
      window.showInformationMessage(`已重命名: ${rawName} → ${selected.name}`);
    } catch (err: any) {
      window.showErrorMessage(`重命名失败: ${err.message || err}`);
    }
  }
}

export const fileNameTranslator = new FileNameTranslator();

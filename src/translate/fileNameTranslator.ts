import { camelCase, pascalCase, snakeCase, paramCase, pathCase } from 'change-case';
import { basename, dirname, extname, join, relative, sep } from 'path';
import { Uri, window, workspace, QuickPickItem } from 'vscode';
import { containsChinese } from '../utils';
import VarTranslator from './index';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const fs = require('fs');

interface FileNameOption extends QuickPickItem {
  fileName: string;
  dirPath: string;
  fullPath: string;
}

export class FileNameTranslator {
  private varTranslate = new VarTranslator();

  /**
   * 检查文件名是否包含中文
   */
  containsChinese(fileName: string): boolean {
    return containsChinese(fileName);
  }

  /**
   * 翻译单个部分
   */
  async translatePart(chinesePart: string): Promise<string | undefined> {
    this.varTranslate.setText(chinesePart);
    
    if (this.varTranslate.isEnglish) {
      return chinesePart;
    }
    
    const translated = await this.varTranslate.translate();
    if (!translated) {
      return undefined;
    }
    
    return translated;
  }

  /**
   * 翻译文件路径（逐部分翻译）
   */
  async translateFilePath(chinesePath: string): Promise<string | undefined> {
    // 按路径分隔符分割
    const parts = chinesePath.split(sep);
    const translatedParts: string[] = [];
    
    for (const part of parts) {
      if (!part) continue; // 跳过空部分
      
      const translatedPart = await this.translatePart(part);
      if (!translatedPart) {
        return undefined;
      }
      translatedParts.push(translatedPart);
    }
    
    return translatedParts.join(sep);
  }

  /**
   * 生成多种命名格式的选项
   */
  private generateFileNameOptions(translatedPath: string, ext: string, workspaceRoot: string): FileNameOption[] {
    const options: FileNameOption[] = [];
    
    // 对每个部分应用不同的命名格式
    const parts = translatedPath.split(sep);
    const fileName = parts[parts.length - 1] || '';
    const dirParts = parts.slice(0, -1);
    
    // 生成不同的命名格式
    const formats = [
      { name: 'camelCase', handler: camelCase },
      { name: 'PascalCase', handler: pascalCase },
      { name: 'snake_case', handler: snakeCase },
      { name: 'param-case', handler: paramCase },
      { name: 'path/case', handler: pathCase },
    ];
    
    for (const format of formats) {
      // 对文件名应用格式
      const formattedFileName = format.handler(fileName);
      
      // 对目录名应用格式（保持目录结构）
      const formattedDirParts = dirParts.map(part => format.handler(part));
      
      // 构建完整路径
      const newRelativePath = [...formattedDirParts, formattedFileName + ext].join('/');
      const fullPath = join(workspaceRoot, ...formattedDirParts, formattedFileName + ext);
      
      options.push({
        label: formattedFileName + ext,
        description: `${format.name} 格式`,
        fileName: formattedFileName + ext,
        dirPath: join(workspaceRoot, ...formattedDirParts),
        fullPath: fullPath,
      });
    }
    
    return options;
  }

  /**
   * 处理文件创建事件
   */
  async handleFileCreation(file: Uri): Promise<void> {
    const workspaceFolder = workspace.getWorkspaceFolder(file);
    if (!workspaceFolder) {
      return;
    }
    
    // 获取相对路径（包含目录）
    const relativePath = relative(workspaceFolder.uri.fsPath, file.fsPath);
    
    // 检测是否包含中文
    if (!this.containsChinese(relativePath)) {
      return;
    }
    
    // 获取文件扩展名
    const ext = extname(relativePath);
    const nameWithoutExt = relativePath.slice(0, -ext.length);
    
    // 翻译文件路径
    const translatedPath = await this.translateFilePath(nameWithoutExt);
    
    if (!translatedPath) {
      window.showErrorMessage('文件名翻译失败，保持原文件名');
      return;
    }
    
    // 生成多种命名格式选项
    const options = this.generateFileNameOptions(translatedPath, ext, workspaceFolder.uri.fsPath);
    
    // 添加保持原文件名选项
    options.push({
      label: basename(relativePath),
      description: '保持原文件名',
      fileName: basename(relativePath),
      dirPath: dirname(file.fsPath),
      fullPath: file.fsPath,
    });
    
    // 显示选择框
    const selected = await window.showQuickPick(options, {
      placeHolder: '检测到中文文件名，选择命名格式：',
      title: '文件名翻译'
    });
    
    if (selected && selected.fullPath !== file.fsPath) {
      // 确保目标目录存在
      await workspace.fs.createDirectory(Uri.file(selected.dirPath));
      
      // 移动文件
      await workspace.fs.rename(file, Uri.file(selected.fullPath));
      
      // 尝试删除空的中文目录
      await this.removeEmptyChineseDirs(file, workspaceFolder.uri.fsPath);
    }
  }

  /**
   * 尝试删除空的中文目录
   */
  private async removeEmptyChineseDirs(file: Uri, workspaceRoot: string): Promise<void> {
    const relativePath = relative(workspaceRoot, file.fsPath);
    const parts = relativePath.split(sep);
    
    // 从最深的目录开始，逐级向上检查
    for (let i = parts.length - 1; i > 0; i--) {
      const part = parts[i];
      if (this.containsChinese(part)) {
        const dirPath = join(workspaceRoot, ...parts.slice(0, i));
        try {
          // 使用Node.js fs模块检查目录是否为空并删除
          const stat = fs.statSync(dirPath);
          if (stat.isDirectory()) {
            const files = fs.readdirSync(dirPath);
            if (files.length === 0) {
              fs.rmdirSync(dirPath);
            }
          }
        } catch {
          // 目录不存在或无法访问，忽略
        }
      }
    }
  }
}

export const fileNameTranslator = new FileNameTranslator();
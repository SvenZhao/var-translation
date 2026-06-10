import { camelCase, paramCase, pascalCase, snakeCase, pathCase } from 'change-case';
import { basename, dirname, extname, join, relative, sep } from 'path';
import { Uri, window, workspace } from 'vscode';
import { containsChinese } from '../utils';
import VarTranslator from './index';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const fs = require('fs');

export class FileNameTranslator {
  private varTranslate = new VarTranslator();

  /**
   * 检查文件名是否包含中文
   */
  containsChinese(fileName: string): boolean {
    return containsChinese(fileName);
  }

  /**
   * 翻译文件名（不含扩展名）
   */
  async translateFileName(chineseName: string): Promise<string | undefined> {
    this.varTranslate.setText(chineseName);
    
    if (this.varTranslate.isEnglish) {
      return chineseName;
    }
    
    const translated = await this.varTranslate.translate();
    if (!translated) {
      return undefined;
    }
    
    return translated;
  }

  /**
   * 生成多种命名格式
   */
  private generateNameFormats(translatedName: string, ext: string): Array<{label: string, description: string, path: string}> {
    // 处理路径分隔符
    const parts = translatedName.split(/[\/\\]/);
    const formats: Array<{label: string, description: string, path: string}> = [];
    
    // 对每个部分应用不同的命名格式
    const applyFormat = (formatter: (str: string) => string, description: string) => {
      const formattedParts = parts.map(part => formatter(part));
      const path = formattedParts.join('/') + ext;
      formats.push({ label: path, description, path });
    };
    
    // 添加各种命名格式
    applyFormat(camelCase, 'camelCase 驼峰(小)');
    applyFormat(pascalCase, 'pascalCase 驼峰(大)');
    applyFormat(snakeCase, 'snakeCase 下划线');
    applyFormat(paramCase, 'paramCase 中划线(小)');
    applyFormat(pathCase, 'pathCase 文件路径');
    
    return formats;
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
    
    // 翻译文件路径（逐部分翻译）
    const parts = nameWithoutExt.split(/[\/\\]/);
    const translatedParts: string[] = [];
    
    for (const part of parts) {
      if (!part) continue;
      const translatedPart = await this.translateFileName(part);
      if (!translatedPart) {
        window.showErrorMessage('文件名翻译失败，保持原文件名');
        return;
      }
      translatedParts.push(translatedPart);
    }
    
    const translatedName = translatedParts.join('/');
    
    // 生成多种命名格式
    const formats = this.generateNameFormats(translatedName, ext);
    
    // 添加保持原文件名选项
    formats.push({ 
      label: basename(relativePath), 
      description: '保持原文件名',
      path: relativePath
    });
    
    // 显示选择框
    const selected = await window.showQuickPick(formats, {
      placeHolder: '检测到中文文件名，选择命名格式：',
      title: '文件名翻译'
    });
    
    if (!selected) {
      return;
    }
    
    // 如果选择保持原文件名，不进行任何操作
    if (selected.description === '保持原文件名') {
      return;
    }
    
    // 构建新文件路径
    const newRelativePath = selected.path;
    const newFilePath = join(workspaceFolder.uri.fsPath, newRelativePath);
    
    // 检查目标文件是否已存在
    try {
      await workspace.fs.stat(Uri.file(newFilePath));
      // 文件已存在，添加数字后缀
      const dir = dirname(newFilePath);
      const baseName = basename(newFilePath, ext);
      let counter = 1;
      let finalFileName = `${baseName}_${counter}${ext}`;
      let finalFilePath = join(dir, finalFileName);
      
      while (true) {
        try {
          await workspace.fs.stat(Uri.file(finalFilePath));
          counter++;
          finalFileName = `${baseName}_${counter}${ext}`;
          finalFilePath = join(dir, finalFileName);
        } catch {
          break;
        }
      }
      
      // 确保目标目录存在
      await workspace.fs.createDirectory(Uri.file(dirname(finalFilePath)));
      // 移动文件
      await workspace.fs.rename(file, Uri.file(finalFilePath));
      // 尝试删除空的中文目录
      await this.removeEmptyChineseDirs(file, workspaceFolder.uri.fsPath);
    } catch {
      // 目标文件不存在，直接移动
      // 确保目标目录存在
      await workspace.fs.createDirectory(Uri.file(dirname(newFilePath)));
      // 移动文件
      await workspace.fs.rename(file, Uri.file(newFilePath));
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

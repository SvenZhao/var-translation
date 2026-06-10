import { camelCase, paramCase, pascalCase, snakeCase, constantCase, capitalCase, dotCase, headerCase, noCase, pathCase } from 'change-case';
import { basename, dirname, extname, join, relative, sep } from 'path';
import { Uri, window, workspace } from 'vscode';
import { changeCaseMap, containsChinese } from '../utils';
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
   * 翻译单个部分（返回原始翻译结果，不做格式转换）
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
    
    // 直接返回翻译结果，不做格式转换
    return translated;
  }

  /**
   * 翻译文件路径（逐部分翻译）
   */
  async translateFilePath(chinesePath: string): Promise<string | undefined> {
    // 按路径分隔符分割（同时处理正斜杠和反斜杠）
    const parts = chinesePath.split(/[\\/]/);
    const translatedParts: string[] = [];
    
    for (const part of parts) {
      if (!part) continue; // 跳过空部分
      
      const translatedPart = await this.translatePart(part);
      if (!translatedPart) {
        return undefined;
      }
      translatedParts.push(translatedPart);
    }
    
    return translatedParts.join('/');
  }

  /**
   * 生成多种命名格式的选项
   */
  generateNameOptions(translatedName: string, originalName: string): { label: string; description: string }[] {
    const options: { label: string; description: string }[] = [];
    
    // 添加各种命名格式
    for (const item of changeCaseMap) {
      options.push({
        label: item.handle(translatedName),
        description: item.description
      });
    }
    
    // 添加保持原文件名选项
    options.push({
      label: originalName,
      description: '保持原文件名'
    });
    
    return options;
  }

  /**
   * 处理文件创建事件
   */
  async handleFileCreation(file: Uri): Promise<void> {
    // 只处理文件，不处理目录
    try {
      const stat = await workspace.fs.stat(file);
      if (stat.type !== 1) { // 1 = FileType.File
        return;
      }
    } catch {
      return;
    }
    
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
    const options = this.generateNameOptions(translatedPath, basename(relativePath));
    
    // 显示选择框
    const selected = await window.showQuickPick(options, {
      placeHolder: '选择文件命名格式',
      title: '文件名翻译'
    });
    
    if (!selected) {
      return;
    }
    
    // 如果选择了保持原文件名，则不重命名
    if (selected.label === basename(relativePath)) {
      return;
    }
    
    // 获取用户选择的文件名
    const newFileName = selected.label;
    
    // 构建新文件路径（保持目录结构，只替换文件名）
    const dir = dirname(file.fsPath);
    const newFilePath = join(dir, newFileName);
    
    // 检查目标文件是否已存在
    try {
      await workspace.fs.stat(Uri.file(newFilePath));
      // 文件已存在，添加数字后缀
      const baseName = basename(newFileName, ext);
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
      
      await workspace.fs.rename(file, Uri.file(finalFilePath));
    } catch {
      // 目标文件不存在，直接重命名
      await workspace.fs.rename(file, Uri.file(newFilePath));
    }
  }

  /**
   * 尝试删除空的中文目录
   */
  private async removeEmptyChineseDirs(file: Uri, workspaceRoot: string): Promise<void> {
    const relativePath = relative(workspaceRoot, file.fsPath);
    const parts = relativePath.split(/[\\/]/);
    
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
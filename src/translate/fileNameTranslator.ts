import { camelCase, paramCase, pascalCase, snakeCase, pathCase } from 'change-case';
import { basename, dirname, extname, join, relative, sep } from 'path';
import { Uri, window, workspace } from 'vscode';
import { containsChinese } from '../utils';
import VarTranslator from './index';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const fs = require('fs');

export class FileNameTranslator {
  private varTranslate = new VarTranslator();
  private processingFiles = new Set<string>();

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
    
    try {
      const translated = await this.varTranslate.translate();
      if (!translated) {
        return chineseName; // 翻译失败时返回原始名称
      }
      return translated;
    } catch (error) {
      console.error('Translation error:', error);
      return chineseName; // 出错时返回原始名称
    }
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
    
    // 检查是否正在处理此文件（防止重复触发）
    if (this.processingFiles.has(file.fsPath)) {
      return;
    }
    
    // 标记正在处理此文件
    this.processingFiles.add(file.fsPath);
    
    try {
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
          // 翻译失败，使用原始部分
          translatedParts.push(part);
        } else {
          translatedParts.push(translatedPart);
        }
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
      
      // 延迟显示选择框，等待文件创建完成
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // 显示选择框
      const selected = await window.showQuickPick(formats, {
        placeHolder: '检测到中文文件名，选择命名格式：',
        title: '文件名翻译',
        ignoreFocusOut: true
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
      
      // 确保目标目录存在
      await workspace.fs.createDirectory(Uri.file(dirname(newFilePath)));
      // 移动文件
      await workspace.fs.rename(file, Uri.file(newFilePath));
      // 尝试删除空的中文目录
      await this.removeEmptyChineseDirs(file, workspaceFolder.uri.fsPath);
    } finally {
      // 移除处理标志
      this.processingFiles.delete(file.fsPath);
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

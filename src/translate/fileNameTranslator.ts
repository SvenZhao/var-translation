import { camelCase, paramCase, pascalCase, snakeCase, constantCase, capitalCase, dotCase, headerCase, noCase, pathCase } from 'change-case';
import { basename, dirname, extname, join, relative, sep } from 'path';
import { QuickPickItem, Uri, window, workspace } from 'vscode';
import { containsChinese } from '../utils';
import VarTranslator from './index';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const fs = require('fs');

interface FileNameQuickPickItem extends QuickPickItem {
  fileName: string;
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
    
    // 返回原始翻译结果，不做格式化
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
    
    return translatedParts.join(' ');
  }

  /**
   * 生成各种命名格式的选项
   */
  generateFileNameOptions(translatedText: string, ext: string): FileNameQuickPickItem[] {
    const options: FileNameQuickPickItem[] = [];
    
    // 对翻译结果进行命名格式转换
    const formats = [
      { name: camelCase, description: 'camelCase 驼峰(小)' },
      { name: pascalCase, description: 'PascalCase 驼峰(大)' },
      { name: snakeCase, description: 'snake_case 下划线' },
      { name: paramCase, description: 'param-case 中划线(小)' },
      { name: headerCase, description: 'Header-Case 中划线(大)' },
      { name: constantCase, description: 'CONSTANT_CASE 常量' },
      { name: capitalCase, description: 'Capital Case 分词(大)' },
      { name: dotCase, description: 'dot.case 对象属性' },
      { name: noCase, description: 'no case 分词(小)' },
      { name: pathCase, description: 'path/case 文件路径' },
    ];
    
    for (const format of formats) {
      const formattedName = format.name(translatedText);
      options.push({
        label: formattedName + ext,
        description: format.description,
        fileName: formattedName + ext
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
    
    // 生成各种命名格式的选项
    const options = this.generateFileNameOptions(translatedPath, ext);
    
    // 添加保持原文件名选项
    options.push({
      label: basename(relativePath),
      description: '保持原文件名',
      fileName: basename(relativePath)
    });
    
    // 显示选择框
    const selected = await window.showQuickPick(options, {
      placeHolder: '选择文件名格式',
      title: '文件名翻译'
    });
    
    if (selected && selected.fileName !== basename(relativePath)) {
      // 构建新文件路径（保持目录结构）
      const dir = dirname(file.fsPath);
      const newFilePath = join(dir, selected.fileName);
      
      // 确保目标目录存在
      await workspace.fs.createDirectory(Uri.file(dirname(newFilePath)));
      
      // 重命名文件
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
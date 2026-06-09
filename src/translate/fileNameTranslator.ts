import { pathCase } from 'change-case';
import { basename, dirname, extname, join, relative, sep } from 'path';
import { Uri, window, workspace } from 'vscode';
import { containsChinese } from '../utils';
import VarTranslator from './index';

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
    
    // 使用pathCase格式，然后取第一部分（避免添加斜杠）
    const pathCased = pathCase(translated);
    // pathCase会将空格等转换为斜杠，我们只需要第一个部分
    return pathCased.split('/')[0] || pathCased;
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
    
    // 构建新文件路径
    const newRelativePath = translatedPath + ext;
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
      
      const options = [
        { label: finalFileName, description: '翻译后的文件名（避免冲突）' },
        { label: basename(relativePath), description: '保持原文件名' }
      ];
      
      const selected = await window.showQuickPick(options, {
        placeHolder: '检测到中文文件名，是否翻译？',
        title: '文件名翻译'
      });
      
      if (selected && selected.label !== basename(relativePath)) {
        // 确保目标目录存在
        await workspace.fs.createDirectory(Uri.file(dirname(finalFilePath)));
        await workspace.fs.rename(file, Uri.file(finalFilePath));
        // 尝试删除空的中文目录
        await this.removeEmptyChineseDirs(file, workspaceFolder.uri.fsPath);
      }
    } catch {
      // 目标文件不存在，直接重命名
      const options = [
        { label: basename(newRelativePath), description: '翻译后的文件名' },
        { label: basename(relativePath), description: '保持原文件名' }
      ];
      
      const selected = await window.showQuickPick(options, {
        placeHolder: '检测到中文文件名，是否翻译？',
        title: '文件名翻译'
      });
      
      if (selected && selected.label !== basename(relativePath)) {
        // 确保目标目录存在
        await workspace.fs.createDirectory(Uri.file(dirname(newFilePath)));
        await workspace.fs.rename(file, Uri.file(newFilePath));
        // 尝试删除空的中文目录
        await this.removeEmptyChineseDirs(file, workspaceFolder.uri.fsPath);
      }
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
          const stat = await workspace.fs.stat(Uri.file(dirPath));
          if (stat.type === 1) { // 1 = FileDirectory
            // 检查目录是否为空
            const files = await workspace.fs.readDirectory(Uri.file(dirPath));
            if (files.length === 0) {
              await workspace.fs.delete(Uri.file(dirPath));
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
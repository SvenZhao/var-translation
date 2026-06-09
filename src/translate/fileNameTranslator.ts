import { pathCase } from 'change-case';
import { basename, dirname, extname, join, relative } from 'path';
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
   * 翻译文件路径
   */
  async translateFilePath(chinesePath: string): Promise<string | undefined> {
    this.varTranslate.setText(chinesePath);
    
    if (this.varTranslate.isEnglish) {
      return chinesePath;
    }
    
    const translated = await this.varTranslate.translate();
    if (!translated) {
      return undefined;
    }
    
    // 使用pathCase格式保持路径结构
    return pathCase(translated);
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
        await workspace.fs.rename(file, Uri.file(finalFilePath));
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
        await workspace.fs.rename(file, Uri.file(newFilePath));
      }
    }
  }
}

export const fileNameTranslator = new FileNameTranslator();
import { camelCase, pascalCase, snakeCase, paramCase, constantCase, headerCase } from 'change-case';
import { basename, dirname, extname, join, relative, sep } from 'path';
import { Uri, ViewColumn, WebviewPanel, window, workspace } from 'vscode';
import { containsChinese } from '../utils';
import VarTranslator from './index';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const fs = require('fs');

interface NameFormat {
  label: string;
  description: string;
  path: string;
}

export class FileNameTranslator {
  private varTranslate = new VarTranslator();
  private processingFiles = new Set<string>();
  private currentPanel: WebviewPanel | undefined;
  private currentFile: Uri | undefined;
  private currentWorkspaceFolder: string | undefined;

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
        return chineseName;
      }
      return translated;
    } catch (error) {
      console.error('Translation error:', error);
      return chineseName;
    }
  }

  /**
   * 生成多种命名格式
   */
  private generateNameFormats(translatedName: string, ext: string): NameFormat[] {
    const pathParts = translatedName.split(/[\/\\]/);
    const formats: NameFormat[] = [];
    
    const applyFormat = (formatter: (str: string) => string, description: string) => {
      const formattedParts = pathParts.map(part => {
        if (part.includes('.')) {
          const subParts = part.split('.');
          const formattedSubParts = subParts.map(sub => formatter(sub));
          return formattedSubParts.join('.');
        }
        return formatter(part);
      });
      const path = formattedParts.join('/') + ext;
      formats.push({ label: path, description, path });
    };
    
    applyFormat(camelCase, 'camelCase 小驼峰');
    applyFormat(pascalCase, 'PascalCase 大驼峰');
    applyFormat(snakeCase, 'snake_case 下划线');
    applyFormat(paramCase, 'kebab-case 短横线');
    applyFormat(constantCase, 'CONSTANT_CASE 常量');
    applyFormat(headerCase, 'Header-Case 短横大写');
    
    return formats;
  }

  /**
   * 生成WebView HTML内容
   */
  private getWebviewContent(formats: NameFormat[]): string {
    const formatOptions = formats.map((format, index) => `
      <div class="format-option" data-index="${index}" data-path="${this.escapeHtml(format.path)}">
        <span class="format-path">${this.escapeHtml(format.path)}</span>
        <span class="format-desc">${this.escapeHtml(format.description)}</span>
      </div>
    `).join('');

    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>文件名翻译</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      background: transparent;
      color: var(--vscode-foreground);
    }
    .overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 1000;
    }
    .dialog {
      background: var(--vscode-editor-background);
      border: 1px solid var(--vscode-widget-border);
      border-radius: 8px;
      width: 500px;
      max-height: 80vh;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
      overflow: hidden;
    }
    .dialog-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px 20px;
      border-bottom: 1px solid var(--vscode-widget-border);
      background: var(--vscode-sideBar-background);
    }
    .dialog-title {
      font-size: 16px;
      font-weight: 600;
      color: var(--vscode-sideBarTitle-foreground);
    }
    .close-btn {
      width: 28px;
      height: 28px;
      border: none;
      background: transparent;
      color: var(--vscode-foreground);
      cursor: pointer;
      border-radius: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 18px;
    }
    .close-btn:hover {
      background: var(--vscode-button-secondaryHoverBackground);
    }
    .dialog-content {
      padding: 16px 20px;
      max-height: 60vh;
      overflow-y: auto;
    }
    .hint {
      font-size: 14px;
      color: var(--vscode-descriptionForeground);
      margin-bottom: 16px;
    }
    .format-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .format-option {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 16px;
      border: 1px solid var(--vscode-widget-border);
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .format-option:hover {
      background: var(--vscode-list-hoverBackground);
      border-color: var(--vscode-focusBorder);
    }
    .format-option.selected {
      background: var(--vscode-list-activeSelectionBackground);
      border-color: var(--vscode-focusBorder);
    }
    .format-path {
      font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
      font-size: 14px;
      color: var(--vscode-foreground);
    }
    .format-desc {
      font-size: 12px;
      color: var(--vscode-descriptionForeground);
    }
    .dialog-footer {
      padding: 16px 20px;
      border-top: 1px solid var(--vscode-widget-border);
      display: flex;
      justify-content: flex-end;
      gap: 12px;
    }
    .btn {
      padding: 8px 16px;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
    }
    .btn-primary {
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
    }
    .btn-primary:hover {
      background: var(--vscode-button-hoverBackground);
    }
    .btn-secondary {
      background: var(--vscode-button-secondaryBackground);
      color: var(--vscode-button-secondaryForeground);
    }
    .btn-secondary:hover {
      background: var(--vscode-button-secondaryHoverBackground);
    }
  </style>
</head>
<body>
  <div class="overlay">
    <div class="dialog">
      <div class="dialog-header">
        <span class="dialog-title">文件名翻译</span>
        <button class="close-btn" id="closeBtn">&times;</button>
      </div>
      <div class="dialog-content">
        <div class="hint">检测到中文文件名，选择命名格式：</div>
        <div class="format-list">
          ${formatOptions}
        </div>
      </div>
      <div class="dialog-footer">
        <button class="btn btn-secondary" id="cancelBtn">取消</button>
        <button class="btn btn-primary" id="confirmBtn" disabled>确认</button>
      </div>
    </div>
  </div>
  <script>
    (function() {
      let selectedIndex = -1;
      const formatOptions = document.querySelectorAll('.format-option');
      const confirmBtn = document.getElementById('confirmBtn');
      const cancelBtn = document.getElementById('cancelBtn');
      const closeBtn = document.getElementById('closeBtn');

      function selectOption(index) {
        formatOptions.forEach(opt => opt.classList.remove('selected'));
        if (index >= 0 && index < formatOptions.length) {
          formatOptions[index].classList.add('selected');
          selectedIndex = index;
          confirmBtn.disabled = false;
        }
      }

      formatOptions.forEach((option, index) => {
        option.addEventListener('click', () => {
          selectOption(index);
        });
      });

      confirmBtn.addEventListener('click', () => {
        if (selectedIndex >= 0) {
          const path = formatOptions[selectedIndex].getAttribute('data-path');
          vscode.postMessage({ type: 'select', path: path });
        }
      });

      cancelBtn.addEventListener('click', () => {
        vscode.postMessage({ type: 'cancel' });
      });

      closeBtn.addEventListener('click', () => {
        vscode.postMessage({ type: 'cancel' });
      });

      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          vscode.postMessage({ type: 'cancel' });
        } else if (e.key === 'Enter' && selectedIndex >= 0) {
          vscode.postMessage({ type: 'select', path: formatOptions[selectedIndex].getAttribute('data-path') });
        } else if (e.key === 'ArrowDown') {
          e.preventDefault();
          selectOption(Math.min(selectedIndex + 1, formatOptions.length - 1));
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          selectOption(Math.max(selectedIndex - 1, 0));
        }
      });

      if (formatOptions.length > 0) {
        selectOption(0);
      }
    })();
  </script>
</body>
</html>`;
  }

  /**
   * 转义HTML特殊字符
   */
  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  /**
   * 显示WebView选择框
   */
  private showWebViewSelection(formats: NameFormat[]): Promise<NameFormat | undefined> {
    return new Promise((resolve) => {
      if (this.currentPanel) {
        this.currentPanel.dispose();
      }

      this.currentPanel = window.createWebviewPanel(
        'fileNameTranslation',
        '文件名翻译',
        ViewColumn.Active,
        {
          enableScripts: true,
          retainContextWhenHidden: false
        }
      );

      this.currentPanel.webview.html = this.getWebviewContent(formats);

      this.currentPanel.webview.onDidReceiveMessage(
        (message) => {
          switch (message.type) {
            case 'select':
              const selectedFormat = formats.find(f => f.path === message.path);
              resolve(selectedFormat);
              this.currentPanel?.dispose();
              break;
            case 'cancel':
              resolve(undefined);
              this.currentPanel?.dispose();
              break;
          }
        },
        undefined,
        []
      );

      this.currentPanel.onDidDispose(
        () => {
          this.currentPanel = undefined;
          resolve(undefined);
        },
        null,
        []
      );
    });
  }

  /**
   * 删除中文文件和空目录
   */
  private async deleteChineseFileAndDirs(file: Uri, workspaceRoot: string): Promise<void> {
    try {
      // 删除文件
      await workspace.fs.delete(file);
      
      // 删除空的中文目录
      const relativePath = relative(workspaceRoot, file.fsPath);
      const parts = relativePath.split(sep);
      
      for (let i = parts.length - 1; i > 0; i--) {
        const part = parts[i];
        if (this.containsChinese(part)) {
          const dirPath = join(workspaceRoot, ...parts.slice(0, i));
          try {
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
    } catch (error) {
      console.error('Error deleting Chinese file:', error);
    }
  }

  /**
   * 处理文件创建事件
   */
  async handleFileCreation(file: Uri): Promise<void> {
    const workspaceFolder = workspace.getWorkspaceFolder(file);
    if (!workspaceFolder) {
      return;
    }
    
    const relativePath = relative(workspaceFolder.uri.fsPath, file.fsPath);
    
    if (!this.containsChinese(relativePath)) {
      return;
    }
    
    if (this.processingFiles.has(file.fsPath)) {
      return;
    }
    
    this.processingFiles.add(file.fsPath);
    this.currentFile = file;
    this.currentWorkspaceFolder = workspaceFolder.uri.fsPath;
    
    try {
      const ext = extname(relativePath);
      const nameWithoutExt = relativePath.slice(0, -ext.length);
      
      const parts = nameWithoutExt.split(/[\/\\]/);
      const translatedParts: string[] = [];
      
      for (const part of parts) {
        if (!part) continue;
        const translatedPart = await this.translateFileName(part);
        if (!translatedPart) {
          translatedParts.push(part);
        } else {
          translatedParts.push(translatedPart);
        }
      }
      
      const translatedName = translatedParts.join('/');
      const formats = this.generateNameFormats(translatedName, ext);
      
      formats.push({ 
        label: basename(relativePath), 
        description: '保持原文件名',
        path: relativePath
      });
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const selected = await this.showWebViewSelection(formats);
      
      if (!selected) {
        // 用户取消，删除中文文件
        await this.deleteChineseFileAndDirs(file, workspaceFolder.uri.fsPath);
        return;
      }
      
      if (selected.description === '保持原文件名') {
        return;
      }
      
      const newRelativePath = selected.path;
      const newFilePath = join(workspaceFolder.uri.fsPath, newRelativePath);
      
      await workspace.fs.createDirectory(Uri.file(dirname(newFilePath)));
      await workspace.fs.rename(file, Uri.file(newFilePath));
      await this.removeEmptyChineseDirs(file, workspaceFolder.uri.fsPath);
    } finally {
      this.processingFiles.delete(file.fsPath);
      this.currentFile = undefined;
      this.currentWorkspaceFolder = undefined;
    }
  }

  /**
   * 尝试删除空的中文目录
   */
  private async removeEmptyChineseDirs(file: Uri, workspaceRoot: string): Promise<void> {
    const relativePath = relative(workspaceRoot, file.fsPath);
    const parts = relativePath.split(sep);
    
    for (let i = parts.length - 1; i > 0; i--) {
      const part = parts[i];
      if (this.containsChinese(part)) {
        const dirPath = join(workspaceRoot, ...parts.slice(0, i));
        try {
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

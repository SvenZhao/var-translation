import { camelCase, pascalCase, snakeCase, paramCase, constantCase, headerCase } from 'change-case';
import { basename, dirname, extname, join, relative, sep } from 'path';
import { Uri, ViewColumn, WebviewPanel, window, workspace } from 'vscode';
import { containsChinese } from '../utils';
import VarTranslator from './index';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const fs = require('fs');

export class FileNameTranslator {
  private varTranslate = new VarTranslator();
  private processingFiles = new Set<string>();
  private currentPanel: WebviewPanel | undefined;

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
    const pathParts = translatedName.split(/[\/\\]/);
    const formats: Array<{label: string, description: string, path: string}> = [];
    
    // 对每个部分应用不同的命名格式，保留点号
    const applyFormat = (formatter: (str: string) => string, description: string) => {
      const formattedParts = pathParts.map(part => {
        // 如果部分包含点号（如 hello.world），需要保留点号结构
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
    
    // 添加用户选择的命名格式
    applyFormat(camelCase, 'camelCase 小驼峰');
    applyFormat(pascalCase, 'PascalCase 大驼峰');
    applyFormat(snakeCase, 'snake_case 下划线');
    applyFormat(paramCase, 'kebab-case 短横线');
    applyFormat(constantCase, 'CONSTANT_CASE 常量');
    applyFormat(headerCase, 'Header-Case 短横大写');
    
    return formats;
  }

  /**
   * 生成 Webview HTML 内容
   */
  private getWebviewContent(formats: Array<{label: string, description: string, path: string}>): string {
    const formatItems = formats.map((format, index) => `
      <div class="format-item" data-index="${index}" data-path="${format.path}">
        <span class="format-path">${format.label}</span>
        <span class="format-desc">${format.description}</span>
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
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      padding: 20px;
    }
    
    .modal {
      background: var(--vscode-editorWidget-background, #252526);
      border: 1px solid var(--vscode-widget-border, #454545);
      border-radius: 8px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
      width: 100%;
      max-width: 500px;
      overflow: hidden;
    }
    
    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 16px;
      background: var(--vscode-editorWidget-background, #252526);
      border-bottom: 1px solid var(--vscode-widget-border, #454545);
    }
    
    .modal-title {
      font-size: 14px;
      font-weight: 600;
      color: var(--vscode-editor-foreground, #cccccc);
    }
    
    .close-btn {
      background: none;
      border: none;
      color: var(--vscode-editor-foreground, #cccccc);
      cursor: pointer;
      font-size: 18px;
      width: 24px;
      height: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 4px;
    }
    
    .close-btn:hover {
      background: var(--vscode-editorWidget-border, #454545);
    }
    
    .modal-body {
      padding: 16px;
    }
    
    .placeholder {
      font-size: 13px;
      color: var(--vscode-descriptionForeground, #999999);
      margin-bottom: 12px;
    }
    
    .format-list {
      max-height: 300px;
      overflow-y: auto;
    }
    
    .format-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 10px 12px;
      margin-bottom: 4px;
      background: var(--vscode-input-background, #3c3c3c);
      border: 1px solid var(--vscode-input-border, #3c3c3c);
      border-radius: 4px;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    
    .format-item:hover {
      background: var(--vscode-list-hoverBackground, #2a2d2e);
      border-color: var(--vscode-focusBorder, #007acc);
    }
    
    .format-item.selected {
      background: var(--vscode-list-activeSelectionBackground, #094771);
      border-color: var(--vscode-focusBorder, #007acc);
    }
    
    .format-path {
      font-family: 'Consolas', 'Monaco', monospace;
      font-size: 13px;
      color: var(--vscode-editor-foreground, #cccccc);
    }
    
    .format-desc {
      font-size: 12px;
      color: var(--vscode-descriptionForeground, #999999);
    }
    
    .modal-footer {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
      padding: 12px 16px;
      border-top: 1px solid var(--vscode-widget-border, #454545);
    }
    
    .btn {
      padding: 6px 16px;
      border-radius: 4px;
      font-size: 13px;
      cursor: pointer;
      border: 1px solid var(--vscode-button-border, #007acc);
      transition: all 0.15s ease;
    }
    
    .btn-cancel {
      background: var(--vscode-button-background, #0e639c);
      color: var(--vscode-button-foreground, #ffffff);
    }
    
    .btn-cancel:hover {
      background: var(--vscode-button-hoverBackground, #1177bb);
    }
    
    .btn-confirm {
      background: var(--vscode-button-background, #0e639c);
      color: var(--vscode-button-foreground, #ffffff);
    }
    
    .btn-confirm:hover {
      background: var(--vscode-button-hoverBackground, #1177bb);
    }
    
    .btn-confirm:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    
    .hint {
      font-size: 12px;
      color: var(--vscode-descriptionForeground, #999999);
      margin-top: 8px;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="modal">
    <div class="modal-header">
      <span class="modal-title">文件名翻译</span>
      <button class="close-btn" id="closeBtn">&times;</button>
    </div>
    <div class="modal-body">
      <div class="placeholder">检测到中文文件名，选择命名格式：</div>
      <div class="format-list">
        ${formatItems}
      </div>
      <div class="hint">按 Enter 确认，Esc 取消</div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-cancel" id="cancelBtn">取消</button>
      <button class="btn btn-confirm" id="confirmBtn" disabled>确认</button>
    </div>
  </div>

  <script>
    (function() {
      let selectedIndex = -1;
      const formatItems = document.querySelectorAll('.format-item');
      const confirmBtn = document.getElementById('confirmBtn');
      const cancelBtn = document.getElementById('cancelBtn');
      const closeBtn = document.getElementById('closeBtn');
      
      // 选择格式项
      formatItems.forEach((item, index) => {
        item.addEventListener('click', () => {
          selectItem(index);
        });
        
        item.addEventListener('dblclick', () => {
          selectItem(index);
          confirmSelection();
        });
      });
      
      function selectItem(index) {
        formatItems.forEach(item => item.classList.remove('selected'));
        if (index >= 0 && index < formatItems.length) {
          selectedIndex = index;
          formatItems[index].classList.add('selected');
          confirmBtn.disabled = false;
        }
      }
      
      function confirmSelection() {
        if (selectedIndex >= 0) {
          const path = formatItems[selectedIndex].getAttribute('data-path');
          vscode.postMessage({ type: 'confirm', path: path });
        }
      }
      
      function cancelSelection() {
        vscode.postMessage({ type: 'cancel' });
      }
      
      // 按钮事件
      confirmBtn.addEventListener('click', confirmSelection);
      cancelBtn.addEventListener('click', cancelSelection);
      closeBtn.addEventListener('click', cancelSelection);
      
      // 键盘事件
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          cancelSelection();
        } else if (e.key === 'Enter') {
          confirmSelection();
        } else if (e.key === 'ArrowDown') {
          e.preventDefault();
          const nextIndex = selectedIndex < formatItems.length - 1 ? selectedIndex + 1 : 0;
          selectItem(nextIndex);
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          const prevIndex = selectedIndex > 0 ? selectedIndex - 1 : formatItems.length - 1;
          selectItem(prevIndex);
        }
      });
      
      // 获取 VSCode API
      const vscode = acquireVsCodeApi();
    })();
  </script>
</body>
</html>`;
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
      
      // 显示 Webview 模态对话框
      const selectedPath = await this.showWebviewModal(formats);
      
      // 用户取消（按Esc或点击关闭按钮）
      if (selectedPath === undefined) {
        // 删除创建的中文文件和空目录
        await this.deleteFileAndEmptyDirs(file, workspaceFolder.uri.fsPath);
        return;
      }
      
      // 如果选择保持原文件名，不进行任何操作
      const selectedFormat = formats.find(f => f.path === selectedPath);
      if (selectedFormat && selectedFormat.description === '保持原文件名') {
        return;
      }
      
      // 构建新文件路径
      const newRelativePath = selectedPath;
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
   * 显示 Webview 模态对话框
   */
  private showWebviewModal(formats: Array<{label: string, description: string, path: string}>): Promise<string | undefined> {
    return new Promise((resolve) => {
      // 如果已有面板，先关闭
      if (this.currentPanel) {
        this.currentPanel.dispose();
      }
      
      // 创建 Webview 面板
      this.currentPanel = window.createWebviewPanel(
        'fileNameTranslator',
        '文件名翻译',
        ViewColumn.Active,
        {
          enableScripts: true,
          retainContextWhenHidden: false
        }
      );
      
      // 设置 Webview 内容
      this.currentPanel.webview.html = this.getWebviewContent(formats);
      
      // 监听 Webview 消息
      this.currentPanel.webview.onDidReceiveMessage(
        (message) => {
          if (message.type === 'confirm') {
            resolve(message.path);
            this.currentPanel?.dispose();
          } else if (message.type === 'cancel') {
            resolve(undefined);
            this.currentPanel?.dispose();
          }
        },
        undefined,
        []
      );
      
      // 监听面板关闭事件
      this.currentPanel.onDidDispose(
        () => {
          resolve(undefined);
          this.currentPanel = undefined;
        },
        null,
        []
      );
    });
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

  /**
   * 删除文件和空的中文目录（用户取消时调用）
   */
  private async deleteFileAndEmptyDirs(file: Uri, workspaceRoot: string): Promise<void> {
    const relativePath = relative(workspaceRoot, file.fsPath);
    const parts = relativePath.split(sep);
    
    // 先删除文件
    try {
      await workspace.fs.delete(file);
    } catch {
      // 文件不存在或无法删除，忽略
    }
    
    // 从最深的目录开始，逐级向上检查并删除空的中文目录
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

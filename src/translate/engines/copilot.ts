import * as vscode from 'vscode';
import { BaseTranslateEngine } from './base';

export class CopilotTranslateEngine extends BaseTranslateEngine {
  readonly name = 'Copilot';
  readonly configSection = 'copilot';

  protected async translate(src: string, targetLang: string): Promise<{ text: string }> {
    try {
      if (typeof vscode.lm === 'undefined') {
        vscode.window.showErrorMessage('当前 VS Code 版本不支持 Copilot API (Language Model API)');
        return { text: '' };
      }

      const { model: modelId } = this.getConfig();
      let model: vscode.LanguageModelChat | undefined;

      if (modelId) {
        const models = await vscode.lm.selectChatModels({ id: modelId });
        if (models.length > 0) {
          model = models[0];
        }
      }

      if (!model) {
        const models = await vscode.lm.selectChatModels({ family: 'gpt-4o' });
        [model] = models.length > 0 ? models : await vscode.lm.selectChatModels();
      }

      if (!model) {
        vscode.window.showErrorMessage('未找到可用的 Copilot 模型，请确保已安装 GitHub Copilot 扩展');
        return { text: '' };
      }

      const messages = [
        vscode.LanguageModelChatMessage.User(
          `你是专业的变量名翻译助手。请将变量名 "${src}" 翻译成${targetLang}，只返回翻译文本，不要加引号和额外符号。`
        ),
      ];

      const response = await model.sendRequest(messages, {}, new vscode.CancellationTokenSource().token);
      let text = '';
      for await (const fragment of response.text) {
        text += fragment;
      }

      return { text: text.trim() };
    } catch (error: any) {
      vscode.window.showErrorMessage(`请求失败: ${error.message || error}`);
      return { text: '' };
    }
  }
}

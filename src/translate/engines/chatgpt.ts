import { window } from 'vscode';
import OpenAI from 'openai';
import { BaseTranslateEngine } from './base';

export class ChatGPTTranslateEngine extends BaseTranslateEngine {
  readonly name = 'ChatGPT';
  readonly configSection = 'openai';

  private client: OpenAI | null = null;

  protected async translate(src: string, targetLang: string): Promise<{ text: string }> {
    const { apiKey, apiBaseUrl, model } = this.getConfig();

    if (!apiKey) {
      window.showErrorMessage('OpenAI API Key 未配置，请先在设置中配置');
      return { text: '' };
    }

    if (!this.client) {
      this.client = new OpenAI({
        apiKey,
        baseURL: apiBaseUrl || undefined,
      });
    }

    try {
      const response = await this.client.chat.completions.create({
        model,
        messages: [
          {
            role: 'system',
            content: '你是专业的变量名翻译助手。收到变量名后，只需返回对应目标语言的准确翻译词汇，不要做任何解释或多余内容。',
          },
          {
            role: 'user',
            content: `请将变量名 "${src}" 翻译成${targetLang}，只返回翻译文本，不要加引号和额外符号。`,
          },
        ],
      });

      return { text: response.choices[0].message?.content || '' };
    } catch (error: any) {
      window.showErrorMessage(`请求失败: ${error.message || error}`);
      return { text: '' };
    }
  }
}

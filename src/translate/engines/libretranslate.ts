import axios from 'axios';
import { window } from 'vscode';
import { BaseTranslateEngine, TranslateResult } from './base';

export class LibreTranslateEngine extends BaseTranslateEngine {
  readonly name = 'LibreTranslate';
  readonly configSection = 'libretranslate';

  protected async translate(src: string, targetLang: string): Promise<TranslateResult> {
    const config = this.getConfig();
    const { apiBaseUrl, apiKey } = config;

    if (!apiBaseUrl) {
      window.showErrorMessage('LibreTranslate API Base URL 未配置，请先在设置中配置');
      return { text: '' };
    }

    try {
      const response = await axios.post(apiBaseUrl, {
        q: src,
        source: 'auto',
        target: targetLang,
        format: 'text',
        api_key: apiKey ?? ''
      });
      return { text: response.data.translatedText };
    } catch (error: any) {
      window.showErrorMessage(`LibreTranslate 请求失败: ${error.message || error}`);
      return { text: '' };
    }
  }
}

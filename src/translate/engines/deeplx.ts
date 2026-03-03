import axios from 'axios';
import { window } from 'vscode';
import { BaseTranslateEngine, TranslateResult } from './base';

export class DeepLXEngine extends BaseTranslateEngine {
  readonly name = 'DeepLX';
  readonly configSection = 'deeplx';

  protected async translate(src: string, targetLang: string): Promise<TranslateResult> {
    const { apiBaseUrl } = this.getConfig();

    if (!apiBaseUrl) {
      window.showErrorMessage('DeepLX API Base URL 未配置，请先在设置中配置');
      return { text: '' };
    }

    try {
      const response = await axios.post(
        apiBaseUrl,
        JSON.stringify({ text: src, target_lang: targetLang, source_lang: 'auto' }),
        { headers: { 'Content-Type': 'application/json' } }
      );

      if (response.data.code !== 200) {
        window.showErrorMessage(`DeepLX 请求失败，错误码：${response.data.code}`);
        return { text: '' };
      }

      return { text: response.data.data };
    } catch (error: any) {
      window.showErrorMessage(`DeepLX 请求失败: ${error.message || error}`);
      return { text: '' };
    }
  }
}

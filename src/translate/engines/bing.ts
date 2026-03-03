import axios from 'axios';
import { window } from 'vscode';
import { BaseTranslateEngine, TranslateResult } from './base';

const AZURE_TRANSLATOR_ENDPOINT = 'https://api.cognitive.microsofttranslator.com';
const API_VERSION = '3.0';

export class BingTranslateEngine extends BaseTranslateEngine {
  readonly name = 'Bing';
  readonly configSection = 'bing';

  protected async translate(src: string, targetLang: string): Promise<TranslateResult> {
    const subscriptionKey = this.getConfigValue('subscriptionKey');
    const region = this.getConfigValue('region') || 'global';

    if (!subscriptionKey) {
      window.showErrorMessage('Bing 翻译未配置，请先在设置中配置 Azure Translator 订阅密钥');
      return { text: '' };
    }

    try {
      const response = await axios.post(
        `${AZURE_TRANSLATOR_ENDPOINT}/translate?api-version=${API_VERSION}&to=${targetLang}`,
        [{ text: src }],
        {
          headers: {
            'Ocp-Apim-Subscription-Key': subscriptionKey,
            'Ocp-Apim-Subscription-Region': region,
            'Content-Type': 'application/json',
          },
        }
      );

      const translations = response.data;
      if (translations && translations.length > 0 && translations[0].translations.length > 0) {
        return { text: translations[0].translations[0].text };
      }

      window.showErrorMessage('Bing 翻译返回结果为空');
      return { text: '' };
    } catch (error: any) {
      window.showErrorMessage(`Bing 翻译失败: ${error.message || error}`);
      return { text: '' };
    }
  }
}

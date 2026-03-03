/* eslint-disable @typescript-eslint/no-require-imports */
import { window } from 'vscode';
import { BaseTranslateEngine, TranslateResult } from './base';

const BaiduTranslate = require('node-baidu-translate');

export class BaiduTranslateEngine extends BaseTranslateEngine {
  readonly name = 'Baidu';
  readonly configSection = 'baidu';

  protected async translate(src: string, targetLang: string): Promise<TranslateResult> {
    const appId = this.getConfigValue('appId');
    const secretKey = this.getConfigValue('secretKey');

    if (!appId || !secretKey) {
      window.showErrorMessage('百度翻译未配置，请先在设置中配置 appId 和 secretKey');
      return { text: '' };
    }

    try {
      if (!this.instance) {
        this.instance = new BaiduTranslate(appId, secretKey);
      }

      const res = await this.instance.translate(src, targetLang);
      return { text: res.trans_result[0].dst };
    } catch (error: any) {
      window.showErrorMessage(`百度翻译失败: ${error.message || error}`);
      return { text: '' };
    }
  }
}

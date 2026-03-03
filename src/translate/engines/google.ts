/* eslint-disable @typescript-eslint/no-require-imports */
import { window } from 'vscode';
import { BaseTranslateEngine, TranslateResult } from './base';

const google = require('@asmagin/google-translate-api');

export class GoogleTranslateEngine extends BaseTranslateEngine {
  readonly name = 'Google';
  readonly configSection = 'google';

  protected async translate(src: string, targetLang: string): Promise<TranslateResult> {
    const tld = this.getConfigValue('tld') || 'com';
    
    try {
      const result = await google(src, { to: targetLang, tld });
      return { text: result.text };
    } catch (error: any) {
      window.showErrorMessage(`Google翻译失败: ${error.message || error}`);
      return { text: '' };
    }
  }
}

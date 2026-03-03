/* eslint-disable @typescript-eslint/no-require-imports */
import { window } from 'vscode';
import { BaseTranslateEngine, TranslateResult } from './base';

const tencentcloud = require('tencentcloud-sdk-nodejs');

export class TencentTranslateEngine extends BaseTranslateEngine {
  readonly name = 'Tencent';
  readonly configSection = 'tencent';

  protected async translate(src: string, targetLang: string): Promise<TranslateResult> {
    const secretId = this.getConfigValue('secretId');
    const secretKey = this.getConfigValue('secretKey');

    if (!secretId || !secretKey) {
      window.showErrorMessage('腾讯翻译未配置，请先在设置中配置 secretId 和 secretKey');
      return { text: '' };
    }

    try {
      if (!this.instance) {
        const TmtClient = tencentcloud.tmt.v20180321.Client;
        const clientConfig = {
          credential: { secretId, secretKey },
          region: 'ap-guangzhou',
          profile: { httpProfile: { endpoint: 'tmt.tencentcloudapi.com' } },
        };
        this.instance = new TmtClient(clientConfig);
      }

      const params = {
        SourceText: src,
        Source: 'auto',
        Target: targetLang,
        ProjectId: 0,
      };

      const res = await this.instance.TextTranslate(params);
      return { text: res.TargetText };
    } catch (error: any) {
      window.showErrorMessage(`腾讯翻译失败: ${error.message || error}`);
      return { text: '' };
    }
  }
}

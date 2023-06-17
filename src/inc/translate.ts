/* eslint-disable @typescript-eslint/no-require-imports */
/* eslint-disable @typescript-eslint/no-shadow */
import { window, workspace } from 'vscode';

const google = require('@asmagin/google-translate-api');
const BaiduTranslate = require('node-baidu-translate');
const tencentcloud = require('tencentcloud-sdk-nodejs');
const { Configuration, OpenAIApi } = require('openai');

let baidu: any;
let tencent: any;
let openai: any;
export enum EengineType {
  google = 'google',
  baidu = 'baidu',
  tencent = 'tencent',
  ChatGpt = 'ChatGpt',
}
const engineType = {
  google: (src: string, to: string) => {
    const tld = workspace.getConfiguration('varTranslation').googleTld;
    return google(src, { to, tld: tld == '' ? 'com' : tld });
  },
  baidu: async (src: string, to: string) => {
    const tokens = workspace.getConfiguration('varTranslation').baiduSecret.split(',');
    const [appid, secretKey] = tokens;
    if (!appid || !secretKey) {
      window.showInformationMessage('百度翻译未配置 请先在设置中配置');
    }
    if (!baidu) {
      baidu = new BaiduTranslate(appid, secretKey);
    }
    const res = await baidu.translate(src, to);
    return { text: res.trans_result[0].dst };
  },
  tencent: async (src: string, to: string) => {
    const tokens = workspace.getConfiguration('varTranslation').tencentSecret.split(',');
    const [secretId, secretKey] = tokens;

    const TmtClient = tencentcloud.tmt.v20180321.Client;
    const clientConfig = {
      credential: { secretId, secretKey },
      region: 'ap-guangzhou',
      profile: { httpProfile: { endpoint: 'tmt.tencentcloudapi.com' } },
    };
    if (!secretId || !secretKey) {
      window.showInformationMessage('腾讯翻译君未配置 请先在设置中配置');
    }
    if (!tencent) {
      tencent = new TmtClient(clientConfig);
    }
    const params = { SourceText: src, Source: 'auto', Target: to, ProjectId: 0 };
    const res = await tencent.TextTranslate(params);
    return { text: res.TargetText };
  },
  ChatGpt: async (src: string, to: string) => {
    const { apiKey, apiBaseUrl } = workspace.getConfiguration('varTranslation').openai;

    if (!apiKey) {
      window.showInformationMessage('openai Api Key未配置 请先在设置中配置');
    }

    if (!openai) {
      const configuration = new Configuration({
        apiKey,
        basePath: apiBaseUrl,
      });
      openai = new OpenAIApi(configuration);
    }

    const res = await openai.createChatCompletion({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are a translator assistant.',
        },
        {
          role: 'user',
          content: `Translate the following text into ${to}. Retain the original format. Return only the translation and nothing else: ${src}`,
        },
      ],
    });

    return { text: res.data.choices[0].message.content };
  },
};
export default engineType;

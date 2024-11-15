/* eslint-disable @typescript-eslint/no-require-imports */
/* eslint-disable @typescript-eslint/no-shadow */
import axios from 'axios';
import { window, workspace } from 'vscode';
import { OpenAIApi, Configuration } from 'openai';

// 引入三个翻译引擎
const google = require('@asmagin/google-translate-api');
const BaiduTranslate = require('node-baidu-translate');
const tencentcloud = require('tencentcloud-sdk-nodejs');

// 定义一个枚举类型，表示不同的翻译引擎
export enum EengineType {
  google = 'google',
  baidu = 'baidu',
  tencent = 'tencent',
  ChatGpt = 'ChatGpt',
  libretranslate = 'libretranslate',
  deeplx = 'deeplx',
}
const getSecret = (engineType: EengineType, secretName: string) => {
  // 获取配置中的密钥字符串，分割为两个部分
  const [part1, part2] = workspace.getConfiguration('varTranslation')[secretName].split(',');
  // 如果没有配置密钥，提示用户
  if (!part1 || !part2) window.showInformationMessage(`${engineType}翻译未配置，请先在设置中配置`);
  // 返回密钥的两个部分
  return [part1, part2];
};

// 定义一个对象，存储不同引擎的函数
const engines = {
  // 谷歌翻译引擎
  google(src: string, to: string) {
    // 获取配置中的谷歌域名后缀，默认为com
    const tld = workspace.getConfiguration('varTranslation').googleTld || 'com';
    try {
      return google(src, { to, tld });
    } catch (error) {
      window.showErrorMessage(`请求失败: ${error}`);
      return { text: '' };
    }
  },
  // 百度翻译引擎
  async baidu(src: string, to: string) {
    // 调用getSecret函数，获取appid和secretKey
    const [appid, secretKey] = getSecret(EengineType.baidu, 'baiduSecret');
    // 创建一个百度翻译实例，只创建一次
    const baidu = (engines as any).baidu.instance || new BaiduTranslate(appid, secretKey);
    (engines as any).baidu.instance = baidu;
    try {
      const res = await baidu.translate(src, to);
      return { text: res.trans_result[0].dst };
    } catch (error) {
      window.showErrorMessage(`请求失败: ${error}`);
      return { text: '' };
    }
  },
  // 腾讯翻译引擎
  async tencent(src: string, to: string) {
    // 调用getSecret函数，获取secretId和secretKey
    const [secretId, secretKey] = getSecret(EengineType.tencent, 'tencentSecret');
    // 创建一个腾讯翻译实例，只创建一次
    const TmtClient = tencentcloud.tmt.v20180321.Client;
    const clientConfig = {
      credential: { secretId, secretKey },
      region: 'ap-guangzhou',
      profile: { httpProfile: { endpoint: 'tmt.tencentcloudapi.com' } },
    };
    const tencent = (engines as any).tencent.instance || new TmtClient(clientConfig);
    (engines as any).tencent.instance = tencent;
    // 调用腾讯翻译接口，返回结果
    const params = { SourceText: src, Source: 'auto', Target: to, ProjectId: 0 };
    try {
      const res = await tencent.TextTranslate(params);
      return { text: res.TargetText };
    } catch (error) {
      window.showErrorMessage(`请求失败: ${error}`);
      return { text: '' };
    }
  },
  async ChatGpt(src: string, to: string) {
    const { apiKey, apiBaseUrl, model } = workspace.getConfiguration('varTranslation').openai;
    if (!apiKey) window.showInformationMessage('openai Api Key未配置 请先在设置中配置');
    let openai = (engines as any).ChatGpt.instance;
    if (!openai) {
      const configuration = new Configuration({ apiKey, basePath: apiBaseUrl });
      openai = new OpenAIApi(configuration);
      (engines as any).ChatGpt.instance = openai;
    }
    try {
      const res = await openai.createChatCompletion({
        model,
        messages: [
          { role: 'system', content: 'You are a technical translator assisting in software development. Ensure that all technical terms, code snippets, and programming-related content are translated accurately, while maintaining their original format.' },
          {
            role: 'user',
            content: `Translate the following text into ${to}, keeping the programming context intact. Retain the original format of code, variable names, and technical terms. Return only the translated text with no additional commentary or explanation: ${src}`,
          },
        ],
      });
      return { text: res.data.choices[0].message.content };
    } catch (error) {
      window.showErrorMessage(`请求失败: ${error}`);
      return { text: '' };
    }

  },
  // libretranslate 翻译
  async libretranslate(src: string, to: string) {
    const { apiBaseUrl, apiKey } = workspace.getConfiguration('varTranslation').libretranslate;
    let libretranslate = (engines as any).libretranslate.instance;
    if (!libretranslate) {
      libretranslate = async (src: string, to: string) => {
        try {
          return await axios.post(apiBaseUrl, {
            q: src,
            source: 'auto',
            target: to,
            format: 'text',
            api_key: apiKey ?? '',
          });
        } catch (err) {
          return err;
        }
      };
      (engines as any).libretranslate.instance = libretranslate;
    }
    try {
      const res = await libretranslate(src, to);
      return { text: res.data.translatedText };
    } catch (error) {
      window.showErrorMessage(`请求失败: ${error}`);
      return { text: '' };
    }
  },
  // deeplx
  async deeplx(src: string, to: string) {
    const { apiBaseUrl } = workspace.getConfiguration('varTranslation').deeplx;

    if (!apiBaseUrl) {
      window.showInformationMessage('请先在设置中配置');
      return { text: '' };
    } else {
      try {
        const response = await axios.post(apiBaseUrl, JSON.stringify({ text: src, target_lang: to, source_lang: "auto" }), {
          headers: {
            'Content-Type': 'application/json'
          }
        });
        if (response.data.code !== 200) {
          window.showErrorMessage(`请求失败，错误码：${response.data.code}`);
          return { text: '' };
        }
        const translatedText = response.data.data;
        return { text: translatedText };
      } catch (error) {
        window.showErrorMessage(`请求失败: ${error}`);
        return { text: '' };
      }
    }
  }
};
export default engines;

/* eslint-disable @typescript-eslint/no-require-imports */
/* eslint-disable @typescript-eslint/no-shadow */
import axios from 'axios';
import { window, workspace, lm, LanguageModelChatMessage, CancellationTokenSource } from 'vscode';
import { OpenAIApi, Configuration } from 'openai';

// 引入翻译引擎
const google = require('@asmagin/google-translate-api');
const BaiduTranslate = require('node-baidu-translate');
const tencentcloud = require('tencentcloud-sdk-nodejs');

// 定义翻译引擎类型
export enum EengineType {
  google = 'google',
  baidu = 'baidu',
  tencent = 'tencent',
  ChatGpt = 'ChatGpt',
  libretranslate = 'libretranslate',
  deeplx = 'deeplx',
  copilot = 'copilot',
}

// 获取配置的密钥
const getSecret = (engineType: EengineType, secretName: string) => {
  const [part1, part2] = workspace.getConfiguration('varTranslation')[secretName]?.split(',') || [];
  if (!part1 || !part2) window.showInformationMessage(`${engineType}翻译未配置，请先在设置中配置`);
  return [part1, part2];
};

// 错误处理函数
const handleError = (error: any) => {
  window.showErrorMessage(`请求失败: ${error.message || error}`);
  return { text: '' };
};

// 创建翻译引擎实例（缓存实例）
const createEngineInstance = <T>(engine: string, factory: () => T) => {
  if (!(engines as any)[engine].instance) {
    (engines as any)[engine].instance = factory();
  }
  return (engines as any)[engine].instance;
};

// 定义翻译引擎
const engines = {
  google(src: string, to: string) {
    const tld = workspace.getConfiguration('varTranslation').googleTld || 'com';
    try {
      return google(src, { to, tld });
    } catch (error) {
      return handleError(error);
    }
  },

  async baidu(src: string, to: string) {
    const [appid, secretKey] = getSecret(EengineType.baidu, 'baiduSecret');
    const baidu = createEngineInstance('baidu', () => new BaiduTranslate(appid, secretKey));
    try {
      const res = await baidu.translate(src, to);
      return { text: res.trans_result[0].dst };
    } catch (error) {
      return handleError(error);
    }
  },

  async tencent(src: string, to: string) {
    const [secretId, secretKey] = getSecret(EengineType.tencent, 'tencentSecret');
    const TmtClient = tencentcloud.tmt.v20180321.Client;
    const clientConfig = {
      credential: { secretId, secretKey },
      region: 'ap-guangzhou',
      profile: { httpProfile: { endpoint: 'tmt.tencentcloudapi.com' } },
    };
    const tencent = createEngineInstance('tencent', () => new TmtClient(clientConfig));
    const params = { SourceText: src, Source: 'auto', Target: to, ProjectId: 0 };
    try {
      const res = await tencent.TextTranslate(params);
      return { text: res.TargetText };
    } catch (error) {
      return handleError(error);
    }
  },

  async ChatGpt(src: string, to: string) {
    const { apiKey, apiBaseUrl, model } = workspace.getConfiguration('varTranslation').openai;
    if (!apiKey) window.showInformationMessage('openai Api Key未配置 请先在设置中配置');
    const openai = createEngineInstance('ChatGpt', () => new OpenAIApi(new Configuration({ apiKey, basePath: apiBaseUrl })));
    try {
      const res = await openai.createChatCompletion({
        model,
        messages: [
          {
            role: 'system',
            content: '你是一名专业的翻译助手，专注于帮助程序员翻译变量名。请根据目标语言翻译输入的变量名，确保翻译后的内容准确反映其含义，无需考虑命名规范。'
          },
          {
            role: 'user',
            content: `请将以下变量名翻译为${to}：${src}`
          },
        ],
      });
      return { text: res.data.choices[0].message.content };
    } catch (error) {
      return handleError(error);
    }
  },

  async libretranslate(src: string, to: string) {
    const { apiBaseUrl, apiKey } = workspace.getConfiguration('varTranslation').libretranslate;
    const libretranslate = createEngineInstance('libretranslate', () => async (src: string, to: string) => {
      try {
        return await axios.post(apiBaseUrl, { q: src, source: 'auto', target: to, format: 'text', api_key: apiKey ?? '' });
      } catch (err) {
        return err;
      }
    });
    try {
      const res = await libretranslate(src, to);
      return { text: res.data.translatedText };
    } catch (error) {
      return handleError(error);
    }
  },

  async deeplx(src: string, to: string) {
    const { apiBaseUrl } = workspace.getConfiguration('varTranslation').deeplx;
    if (!apiBaseUrl) {
      window.showInformationMessage('请先在设置中配置');
      return { text: '' };
    }
    try {
      const response = await axios.post(apiBaseUrl, JSON.stringify({ text: src, target_lang: to, source_lang: "auto" }), {
        headers: { 'Content-Type': 'application/json' },
      });
      if (response.data.code !== 200) {
        window.showErrorMessage(`请求失败，错误码：${response.data.code}`);
        return { text: '' };
      }
      return { text: response.data.data };
    } catch (error) {
      return handleError(error);
    }
  },

  async copilot(src: string, to: string) {
    try {
      // @ts-ignore
      if (typeof lm === 'undefined') {
        window.showErrorMessage('当前 VS Code 版本不支持 Copilot API (Language Model API)');
        return { text: '' };
      }

      const { model: modelId } = workspace.getConfiguration('varTranslation').copilot || {};
      let model;

      // @ts-ignore
      if (modelId) {
        // @ts-ignore
        const models = await lm.selectChatModels({ id: modelId });
        if (models.length > 0) {
          model = models[0];
        }
      }

      if (!model) {
        // @ts-ignore
        const models = await lm.selectChatModels({ family: 'gpt-4o' });
        // @ts-ignore
        [model] = models.length > 0 ? models : await lm.selectChatModels();
      }

      if (!model) {
        window.showErrorMessage('未找到可用的 Copilot 模型，请确保已安装 GitHub Copilot 扩展');
        return { text: '' };
      }

      const messages = [
        LanguageModelChatMessage.User(`你是专业的变量名翻译助手。请将变量名 "${src}" 翻译成${to}，只返回翻译文本，不要加引号和额外符号。`)
      ];

      const response = await model.sendRequest(messages, {}, new CancellationTokenSource().token);
      let text = '';
      for await (const fragment of response.text) {
        text += fragment;
      }
      return { text: text.trim() };
    } catch (error) {
      return handleError(error);
    }
  }
};

export default engines;

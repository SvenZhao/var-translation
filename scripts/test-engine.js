#!/usr/bin/env node

/**
 * 翻译引擎独立测试脚本
 *
 * 使用方法：
 *   1. 在下方 CONFIG 中填入你要测试的引擎的 API Key
 *   2. 运行: node scripts/test-engine.js
 *   3. 如果只想测试某个引擎: node scripts/test-engine.js google
 *
 * PR 贡献者请在提交前确保你修改的引擎能通过此测试。
 */

const axios = require('axios');

// ============================================================
// 在这里填入你的 API Key（不要提交到 git！）
// ============================================================
const CONFIG = {
  google: {
    tld: 'com', // 谷歌翻译顶级域名
  },
  baidu: {
    appId: '',      // 百度翻译 App ID
    secretKey: '',  // 百度翻译 Secret Key
  },
  tencent: {
    secretId: '',   // 腾讯翻译 Secret ID
    secretKey: '',  // 腾讯翻译 Secret Key
  },
  openai: {
    apiKey: '',     // OpenAI API Key (sk-xxx)
    apiBaseUrl: '', // 留空使用官方地址
    model: 'gpt-3.5-turbo',
  },
  bing: {
    subscriptionKey: '', // Azure Translator 订阅密钥
    region: 'global',
  },
  libretranslate: {
    apiBaseUrl: 'http://localhost:5000/translate',
    apiKey: '',
  },
  deeplx: {
    apiBaseUrl: 'http://localhost:1188/translate',
  },
};

// ============================================================
// 测试用例
// ============================================================
const TEST_CASES = [
  { src: '你好世界', targetLang: 'en', description: '中文 → 英文' },
  { src: 'hello world', targetLang: 'zh', description: '英文 → 中文' },
];

// ============================================================
// 引擎测试实现
// ============================================================
const engines = {
  async google(src, targetLang) {
    const googleTranslate = require('@asmagin/google-translate-api');
    const result = await googleTranslate(src, { to: targetLang, tld: CONFIG.google.tld });
    return result.text;
  },

  async baidu(src, targetLang) {
    const { appId, secretKey } = CONFIG.baidu;
    if (!appId || !secretKey) throw new Error('请先配置 baidu.appId 和 baidu.secretKey');
    const BaiduTranslate = require('node-baidu-translate');
    const client = new BaiduTranslate(appId, secretKey);
    const res = await client.translate(src, targetLang);
    return res.trans_result[0].dst;
  },

  async tencent(src, targetLang) {
    const { secretId, secretKey } = CONFIG.tencent;
    if (!secretId || !secretKey) throw new Error('请先配置 tencent.secretId 和 tencent.secretKey');
    const tencentcloud = require('tencentcloud-sdk-nodejs');
    const TmtClient = tencentcloud.tmt.v20180321.Client;
    const client = new TmtClient({
      credential: { secretId, secretKey },
      region: 'ap-guangzhou',
      profile: { httpProfile: { endpoint: 'tmt.tencentcloudapi.com' } },
    });
    const res = await client.TextTranslate({ SourceText: src, Source: 'auto', Target: targetLang, ProjectId: 0 });
    return res.TargetText;
  },

  async openai(src, targetLang) {
    const { apiKey, apiBaseUrl, model } = CONFIG.openai;
    if (!apiKey) throw new Error('请先配置 openai.apiKey');
    const OpenAI = require('openai');
    const client = new OpenAI({ apiKey, baseURL: apiBaseUrl || undefined });
    const res = await client.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: '你是专业的变量名翻译助手。只返回翻译结果，不要解释。' },
        { role: 'user', content: `请将 "${src}" 翻译成${targetLang}，只返回翻译文本。` },
      ],
    });
    return (res.choices[0].message?.content || '').replace(/["\n\r]/g, '');
  },

  async bing(src, targetLang) {
    const { subscriptionKey, region } = CONFIG.bing;
    if (!subscriptionKey) throw new Error('请先配置 bing.subscriptionKey');
    const res = await axios.post(
      `https://api.cognitive.microsofttranslator.com/translate?api-version=3.0&to=${targetLang}`,
      [{ text: src }],
      {
        headers: {
          'Ocp-Apim-Subscription-Key': subscriptionKey,
          'Ocp-Apim-Subscription-Region': region,
          'Content-Type': 'application/json',
        },
      }
    );
    return res.data[0].translations[0].text;
  },

  async libretranslate(src, targetLang) {
    const { apiBaseUrl, apiKey } = CONFIG.libretranslate;
    if (!apiBaseUrl) throw new Error('请先配置 libretranslate.apiBaseUrl');
    const res = await axios.post(apiBaseUrl, {
      q: src, source: 'auto', target: targetLang, format: 'text', api_key: apiKey || '',
    });
    return res.data.translatedText;
  },

  async deeplx(src, targetLang) {
    const { apiBaseUrl } = CONFIG.deeplx;
    if (!apiBaseUrl) throw new Error('请先配置 deeplx.apiBaseUrl');
    const res = await axios.post(apiBaseUrl, { text: src, target_lang: targetLang, source_lang: 'auto' }, {
      headers: { 'Content-Type': 'application/json' },
    });
    if (res.data.code !== 200) throw new Error(`错误码: ${res.data.code}`);
    return res.data.data;
  },
};

// ============================================================
// 运行测试
// ============================================================
async function testEngine(name) {
  const engine = engines[name];
  if (!engine) {
    console.log(`❌ 未知引擎: ${name}`);
    return false;
  }

  console.log(`\n🔧 测试引擎: ${name}`);
  console.log('─'.repeat(40));

  let allPassed = true;
  for (const testCase of TEST_CASES) {
    try {
      const result = await engine(testCase.src, testCase.targetLang);
      if (result && result.length > 0) {
        console.log(`  ✅ ${testCase.description}: "${testCase.src}" → "${result}"`);
      } else {
        console.log(`  ❌ ${testCase.description}: 返回结果为空`);
        allPassed = false;
      }
    } catch (error) {
      console.log(`  ❌ ${testCase.description}: ${error.message}`);
      allPassed = false;
    }
  }
  return allPassed;
}

async function main() {
  const targetEngine = process.argv[2];

  console.log('🚀 驼峰翻译助手 - 引擎测试');
  console.log('═'.repeat(40));

  if (targetEngine) {
    await testEngine(targetEngine);
  } else {
    const results = {};
    for (const name of Object.keys(engines)) {
      results[name] = await testEngine(name);
    }

    console.log('\n\n📊 测试结果汇总');
    console.log('═'.repeat(40));
    for (const [name, passed] of Object.entries(results)) {
      console.log(`  ${passed ? '✅' : '❌'} ${name}`);
    }
  }
}

main().catch(console.error);

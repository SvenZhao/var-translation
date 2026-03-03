import { env } from 'vscode';

const zhMessages: Record<string, string> = {
  'engine.notFound': '未找到可用的翻译引擎',
  'engine.translating': '{engine}翻译: {text} 到 {target}',
  'engine.failed': '翻译失败: {message}',
  'engine.cached': '使用缓存: {text}',
  'engine.configUpdated': '用户更新配置',
  'config.migrated': '驼峰翻译助手：配置已自动迁移到新格式，旧配置项已清除。',
  'config.selectEngine': '请选择要配置的翻译引擎',
  'config.title': '配置翻译引擎',
  'config.success': '✅ {engine} 翻译引擎配置成功，连通性测试通过！',
  'config.testFailed': '⚠️ {engine} 翻译引擎已配置，但连通性测试失败，请检查配置。',
  'copilot.selectModel': '请选择用于翻译的 Copilot 模型',
  'copilot.selectTitle': '选择 Copilot 模型',
  'copilot.modelSet': '已设置 Copilot 翻译模型为: {model}',
  'copilot.notSupported': '当前 VS Code 版本不支持 Copilot API',
  'copilot.noModels': '未找到可用的 Copilot 模型，请确保已安装 GitHub Copilot 扩展并已登录',
  'copilot.fetchFailed': '获取模型列表失败: {message}',
  'translate.placeholder': '选择替换',
  'translate.translating': '正在翻译中',
  'translate.result': '翻译',
  'google.failed': 'Google翻译失败: {message}',
  'baidu.notConfigured': '百度翻译未配置，请先在设置中配置 appId 和 secretKey',
  'baidu.failed': '百度翻译失败: {message}',
  'tencent.notConfigured': '腾讯翻译未配置，请先在设置中配置 secretId 和 secretKey',
  'tencent.failed': '腾讯翻译失败: {message}',
  'openai.notConfigured': 'OpenAI API Key 未配置，请先在设置中配置',
  'openai.failed': '请求失败: {message}',
  'bing.notConfigured': 'Bing 翻译未配置，请先在设置中配置 Azure Translator 订阅密钥',
  'bing.empty': 'Bing 翻译返回结果为空',
  'bing.failed': 'Bing 翻译失败: {message}',
  'libretranslate.notConfigured': 'LibreTranslate API Base URL 未配置，请先在设置中配置',
  'libretranslate.failed': 'LibreTranslate 请求失败: {message}',
  'deeplx.notConfigured': 'DeepLX API Base URL 未配置，请先在设置中配置',
  'deeplx.codeError': 'DeepLX 请求失败，错误码：{code}',
  'deeplx.failed': 'DeepLX 请求失败: {message}',
};

const enMessages: Record<string, string> = {
  'engine.notFound': 'No available translation engine found',
  'engine.translating': '{engine} translating: {text} to {target}',
  'engine.failed': 'Translation failed: {message}',
  'engine.cached': 'Using cache: {text}',
  'engine.configUpdated': 'Configuration updated',
  'config.migrated': 'Variable Translation Helper: Configuration has been migrated to the new format.',
  'config.selectEngine': 'Select translation engine to configure',
  'config.title': 'Configure Translation Engine',
  'config.success': '✅ {engine} translation engine configured successfully, connectivity test passed!',
  'config.testFailed': '⚠️ {engine} translation engine configured, but connectivity test failed. Please check your settings.',
  'copilot.selectModel': 'Select a Copilot model for translation',
  'copilot.selectTitle': 'Select Copilot Model',
  'copilot.modelSet': 'Copilot translation model set to: {model}',
  'copilot.notSupported': 'Current VS Code version does not support Copilot API',
  'copilot.noModels': 'No available Copilot models found. Please ensure GitHub Copilot extension is installed and signed in.',
  'copilot.fetchFailed': 'Failed to fetch model list: {message}',
  'translate.placeholder': 'Select replacement',
  'translate.translating': 'Translating...',
  'translate.result': 'Translation',
  'google.failed': 'Google translation failed: {message}',
  'baidu.notConfigured': 'Baidu Translate not configured. Please set appId and secretKey in settings.',
  'baidu.failed': 'Baidu translation failed: {message}',
  'tencent.notConfigured': 'Tencent Translate not configured. Please set secretId and secretKey in settings.',
  'tencent.failed': 'Tencent translation failed: {message}',
  'openai.notConfigured': 'OpenAI API Key not configured. Please set it in settings.',
  'openai.failed': 'Request failed: {message}',
  'bing.notConfigured': 'Bing Translate not configured. Please set Azure Translator subscription key in settings.',
  'bing.empty': 'Bing translation returned empty result',
  'bing.failed': 'Bing translation failed: {message}',
  'libretranslate.notConfigured': 'LibreTranslate API Base URL not configured. Please set it in settings.',
  'libretranslate.failed': 'LibreTranslate request failed: {message}',
  'deeplx.notConfigured': 'DeepLX API Base URL not configured. Please set it in settings.',
  'deeplx.codeError': 'DeepLX request failed, error code: {code}',
  'deeplx.failed': 'DeepLX request failed: {message}',
};

function isChineseLocale(): boolean {
  const language = env.language;
  return language.startsWith('zh');
}

export function t(key: string, params?: Record<string, string>): string {
  const messages = isChineseLocale() ? zhMessages : enMessages;
  let message = messages[key] || key;

  if (params) {
    for (const [paramKey, paramValue] of Object.entries(params)) {
      message = message.replace(`{${paramKey}}`, paramValue);
    }
  }

  return message;
}

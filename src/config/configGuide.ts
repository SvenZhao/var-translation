import { window, workspace } from 'vscode';
import { EengineType } from '../translate/engines';
import { engineRegistry } from '../translate/engines';

interface EngineConfigField {
  key: string;
  prompt: string;
  password?: boolean;
}

const ENGINE_CONFIG_FIELDS: Record<string, EngineConfigField[]> = {
  [EengineType.google]: [
    { key: 'google.tld', prompt: '请输入谷歌翻译顶级域名（默认 com）' },
  ],
  [EengineType.baidu]: [
    { key: 'baidu.appId', prompt: '请输入百度翻译 App ID' },
    { key: 'baidu.secretKey', prompt: '请输入百度翻译 Secret Key', password: true },
  ],
  [EengineType.tencent]: [
    { key: 'tencent.secretId', prompt: '请输入腾讯翻译 Secret ID' },
    { key: 'tencent.secretKey', prompt: '请输入腾讯翻译 Secret Key', password: true },
  ],
  [EengineType.ChatGpt]: [
    { key: 'openai.apiKey', prompt: '请输入 OpenAI API Key（sk- 开头）', password: true },
    { key: 'openai.apiBaseUrl', prompt: '请输入 API 基础 URL（留空使用官方地址）' },
    { key: 'openai.model', prompt: '请输入模型名称（默认 gpt-3.5-turbo）' },
  ],
  [EengineType.bing]: [
    { key: 'bing.subscriptionKey', prompt: '请输入 Azure Translator 订阅密钥', password: true },
    { key: 'bing.region', prompt: '请输入 Azure 区域（默认 global）' },
  ],
  [EengineType.libretranslate]: [
    { key: 'libretranslate.apiBaseUrl', prompt: '请输入 LibreTranslate API 地址' },
    { key: 'libretranslate.apiKey', prompt: '请输入 API Key（无需则留空）', password: true },
  ],
  [EengineType.deeplx]: [
    { key: 'deeplx.apiBaseUrl', prompt: '请输入 DeepLX API 地址' },
  ],
  [EengineType.copilot]: [
    { key: 'copilot.model', prompt: '请输入 Copilot 模型 ID（留空自动选择）' },
  ],
};

export async function configEngineGuide(): Promise<void> {
  const engineItems = [
    { label: '⭐ Copilot', description: 'VS Code Copilot（零配置，需要 Copilot 扩展）', value: EengineType.copilot },
    { label: '⭐ ChatGPT', description: 'OpenAI / 兼容 API（需要 API Key）', value: EengineType.ChatGpt },
    { label: 'Google', description: '谷歌翻译（免费，无需 Key）', value: EengineType.google },
    { label: 'Bing', description: 'Azure Translator（每月 200 万字符免费）', value: EengineType.bing },
    { label: 'DeepLX', description: 'DeepL 免费代理', value: EengineType.deeplx },
    { label: 'Baidu', description: '百度翻译（需要 API Key）', value: EengineType.baidu },
    { label: 'Tencent', description: '腾讯翻译君（需要 API Key）', value: EengineType.tencent },
    { label: 'LibreTranslate', description: '自建翻译服务', value: EengineType.libretranslate },
  ];

  const selected = await window.showQuickPick(engineItems, {
    placeHolder: '请选择要配置的翻译引擎',
    title: '配置翻译引擎',
  });

  if (!selected) return;

  const config = workspace.getConfiguration('varTranslation');
  const fields = ENGINE_CONFIG_FIELDS[selected.value] || [];

  for (const field of fields) {
    const currentValue = config.get<string>(field.key) || '';
    const inputValue = await window.showInputBox({
      prompt: field.prompt,
      value: currentValue,
      password: field.password,
      ignoreFocusOut: true,
    });

    if (inputValue === undefined) return;

    if (inputValue !== currentValue) {
      await config.update(field.key, inputValue, true);
    }
  }

  await config.update('translationEngine', selected.value, true);

  const testResult = await testEngineConnection(selected.value);
  if (testResult) {
    window.showInformationMessage(`✅ ${selected.label} 翻译引擎配置成功，连通性测试通过！`);
  } else {
    window.showWarningMessage(`⚠️ ${selected.label} 翻译引擎已配置，但连通性测试失败，请检查配置。`);
  }
}

async function testEngineConnection(engineType: string): Promise<boolean> {
  try {
    const engine = engineRegistry[engineType];
    if (!engine) return false;

    const result = await engine.execute('hello', 'zh');
    return result.text.length > 0;
  } catch {
    return false;
  }
}

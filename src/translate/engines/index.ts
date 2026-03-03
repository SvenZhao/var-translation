// 导入基类和类型
export { BaseTranslateEngine, TranslateResult } from './base';

// 导入各个引擎
import { GoogleTranslateEngine } from './google';
import { BaiduTranslateEngine } from './baidu';
import { TencentTranslateEngine } from './tencent';
import { ChatGPTTranslateEngine } from './chatgpt';
import { LibreTranslateEngine } from './libretranslate';
import { DeepLXEngine } from './deeplx';
import { CopilotTranslateEngine } from './copilot';
import { BingTranslateEngine } from './bing';
import { BaseTranslateEngine } from './base';

// 定义翻译引擎类型枚举（按推荐优先级排序）
export enum EengineType {
  copilot = 'copilot',
  ChatGpt = 'ChatGpt',
  google = 'google',
  bing = 'bing',
  deeplx = 'deeplx',
  baidu = 'baidu',
  tencent = 'tencent',
  libretranslate = 'libretranslate',
}

// 引擎注册表
export const engineRegistry: Record<string, BaseTranslateEngine> = {
  [EengineType.copilot]: new CopilotTranslateEngine(),
  [EengineType.ChatGpt]: new ChatGPTTranslateEngine(),
  [EengineType.google]: new GoogleTranslateEngine(),
  [EengineType.bing]: new BingTranslateEngine(),
  [EengineType.deeplx]: new DeepLXEngine(),
  [EengineType.baidu]: new BaiduTranslateEngine(),
  [EengineType.tencent]: new TencentTranslateEngine(),
  [EengineType.libretranslate]: new LibreTranslateEngine(),
};

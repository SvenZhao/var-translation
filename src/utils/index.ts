import { franc } from 'franc-min';

export function isEnglish(text: string): boolean {
  // 使用 franc-min 来检测语言，'en' 代表英语
  return franc(text) === 'eng';
}

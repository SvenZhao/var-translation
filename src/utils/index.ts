export function isChinese(text: string): boolean {
  const regex = /[\u4e00-\u9fa5]/;
  return regex.test(text);
}

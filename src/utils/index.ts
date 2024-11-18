import { camelCase, paramCase, pascalCase, snakeCase, constantCase, capitalCase, dotCase, headerCase, noCase, pathCase } from 'change-case';
export function isChinese(text: string): boolean {
  const regex = /[\u4e00-\u9fa5]/;
  return regex.test(text);
}

export const changeCaseMap = [
  { name: 'camelCase', handle: camelCase, description: 'camelCase 驼峰(小)' },
  { name: 'pascalCase', handle: pascalCase, description: 'pascalCase 驼峰(大)' },
  { name: 'snakeCase', handle: snakeCase, description: 'snakeCase 下划线' },
  { name: 'paramCase', handle: paramCase, description: 'paramCase 中划线(小)' },
  { name: 'headerCase', handle: headerCase, description: 'headerCase 中划线(大)' },
  { name: 'noCase', handle: noCase, description: 'noCase 分词(小)' },
  { name: 'capitalCase', handle: capitalCase, description: 'capitalCase 分词(大)' },
  { name: 'dotCase', handle: dotCase, description: 'dotCase 对象属性' },
  { name: 'pathCase', handle: pathCase, description: 'pathCase 文件路径' },
  { name: 'constantCase', handle: constantCase, description: 'constantCase 常量' },
];

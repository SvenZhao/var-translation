/* eslint-disable @typescript-eslint/no-require-imports */
/* eslint-disable @typescript-eslint/no-shadow */
import { window, workspace } from 'vscode';

// 引入三个翻译引擎
const google = require('@asmagin/google-translate-api');
const BaiduTranslate = require('node-baidu-translate');
const tencentcloud = require('tencentcloud-sdk-nodejs');

// 定义一个枚举类型，表示不同的翻译引擎
export enum EengineType {
  google = 'google',
  baidu = 'baidu',
  tencent = 'tencent',
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
    // 调用谷歌翻译接口，返回结果
    return google(src, { to, tld });
  },
  // 百度翻译引擎
  async baidu(src: string, to: string) {
    // 调用getSecret函数，获取appid和secretKey
    const [appid, secretKey] = getSecret(EengineType.baidu, 'baiduSecret');
    // 创建一个百度翻译实例，只创建一次
    const baidu = (engines as any).baidu.instance || new BaiduTranslate(appid, secretKey);
    (engines as any).baidu.instance = baidu;
    // 调用百度翻译接口，返回结果
    const res = await baidu.translate(src, to);
    return { text: res.trans_result[0].dst };
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
    const res = await tencent.TextTranslate(params);
    return { text: res.TargetText };
  },
};
export default engines;

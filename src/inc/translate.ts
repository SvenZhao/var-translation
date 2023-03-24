/* eslint-disable @typescript-eslint/no-require-imports */
/* eslint-disable @typescript-eslint/no-shadow */
import { window, workspace } from 'vscode';

const google = require('@asmagin/google-translate-api');
const BaiduTranslate = require('node-baidu-translate');
const tencentcloud = require('tencentcloud-sdk-nodejs');

let baidu: any;
let tencent: any;
export enum EengineType {
  google = 'google',
  baidu = 'baidu',
  tencent = 'tencent',
}
const googleEngine = (src: string, to: string) => {
  const tld = workspace.getConfiguration('varTranslation').googleTld;
  return google(src, { to, tld: tld == '' ? 'com' : tld });
};
const baiduEngine = async (src: string, to: string) => {
  const tokens = workspace.getConfiguration('varTranslation').baiduSecret.split(',');
  const [appid, secretKey] = tokens;
  if (!appid || !secretKey) window.showInformationMessage('百度翻译未配置 请先在设置中配置');
  if (!baidu) baidu = new BaiduTranslate(appid, secretKey);
  const res = await baidu.translate(src, to);
  return { text: res.trans_result[0].dst };
};
const tencentEngine = async (src: string, to: string) => {
  const tokens = workspace.getConfiguration('varTranslation').tencentSecret.split(',');
  const [secretId, secretKey] = tokens;
  const TmtClient = tencentcloud.tmt.v20180321.Client;
  const clientConfig = {
    credential: { secretId, secretKey },
    region: 'ap-guangzhou',
    profile: { httpProfile: { endpoint: 'tmt.tencentcloudapi.com' } },
  };
  if (!secretId || !secretKey) window.showInformationMessage('腾讯翻译君未配置 请先在设置中配置');
  if (!tencent) tencent = new TmtClient(clientConfig);
  const params = { SourceText: src, Source: 'auto', Target: to, ProjectId: 0 };
  const res = await tencent.TextTranslate(params);
  return { text: res.TargetText };
};
export default {
  google: googleEngine,
  baidu: baiduEngine,
  tencent: tencentEngine,
};

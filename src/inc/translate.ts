import { window, workspace } from "vscode";

const google = require("@asmagin/google-translate-api");
const baiduTranslate = require("node-baidu-translate");
const tencentcloud = require("tencentcloud-sdk-nodejs");

let baidu: any;
let tencent: any;
export enum EengineType {
  google = "google",
  baidu = "baidu",
  tencent = "tencent",
}
const engineType = {
  google: (src: string, to: string) => {
    return google(src, { to, tld: "cn" });
  },
  baidu: async (src: string, to: string) => {
    const baiduSecret: string = workspace.getConfiguration("varTranslation").baiduSecret;
    const [appid, secretKey] = baiduSecret.split(",");
    if (!appid || !secretKey) {
      window.showInformationMessage("百度翻译未配置 请先在设置中配置");
    }
    if (!baidu) {
      baidu = new baiduTranslate(appid, secretKey);
    }
    const res = await baidu.translate(src, to);
    return { text: res.trans_result[0].dst };
  },
  tencent: async (src: string, to: string) => {
    const tencentSecret: string = workspace.getConfiguration("varTranslation").tencentSecret;
    const [secretId, secretKey] = tencentSecret.split(",");
    const TmtClient = tencentcloud.tmt.v20180321.Client;
    const clientConfig = {
      credential: { secretId: secretId, secretKey: secretKey },
      region: "ap-guangzhou",
      profile: { httpProfile: { endpoint: "tmt.tencentcloudapi.com" } },
    };
    if (!secretId || !secretKey) {
      window.showInformationMessage("腾讯翻译君未配置 请先在设置中配置");
    }
    if (!baidu) {
      tencent = new TmtClient(clientConfig);
    }
    const params = {
      SourceText: src, Source: "auto", Target: to,
      ProjectId: 0,
    };
    const res = await tencent.TextTranslate(params);
    return { text: res.TargetText };
  },
};
export default engineType;

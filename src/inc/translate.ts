const google = require("@asmagin/google-translate-api");
const { translate: bing } = require("bing-translate-api");

export enum EengineType {
  google = "google",
  bing = "bing",
}
const engineType = {
  google: (src: string, config: any) => {
    return google(src, { ...config, tld: "cn" });
  },
  bing: async (src: string, { to }: { to: string }) => {
    const res = await bing(src, null, to, true);
    return { text: res.translation };
  },
};
export default engineType;

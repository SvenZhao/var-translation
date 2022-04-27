const google = require("@asmagin/google-translate-api");

export enum EengineType {
  google = "google",
}
const engineType = {
  google: (src: string, config: any) => {
    return google(src, { ...config, tld: "cn" });
  }
};
export default engineType;

import { GoogleTranslator } from '@translate-tools/core/translators/GoogleTranslator';
// const bing = new GoogleTranslator();
const google = new GoogleTranslator();
const bing = new GoogleTranslator();
export enum EengineType {
  google = "google",
  bing = "bing",
}
const engineType = {
  google: async (src: string, { to }: { to: any }) => {
    const res = await google.translate(src, 'auto', to);
    return { text: res };
  },
  bing: async (src: string, { to }: { to: any }) => {
    const res = await bing.translate(src, 'auto', to);
    return { text: res };
  },
};
export default engineType;

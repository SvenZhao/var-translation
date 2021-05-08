/* eslint-disable */
const got = require('got');

async function translate(word, lang) {
    let url = 'https://edge.microsoft.com/translate/auth' // token url
    let req;

    try {
        req = await got.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Linux; Android 5.0; SM-G900P Build/LRX21T) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/69.0.3497.100 Mobile Safari/537.36'
            }
        });
        let token = req.body;
        if (lang.from == 'auto') lang.from = null;
        url = `https://api.cognitive.microsofttranslator.com/translate?${lang.from ? `from=${lang.from}&` : ''}to=${lang.to}&api-version=3.0&includeSentenceLength=false`
        req = await got.post(url, {
            json: [ { Text: word } ],
            throwHttpErrors: false,
            headers: {
                'authorization': `Bearer ${token}`,
                'User-Agent': 'Mozilla/5.0 (Linux; Android 5.0; SM-G900P Build/LRX21T) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/69.0.3497.100 Mobile Safari/537.36'
            }
        });
        let translate = JSON.parse(req.body);
        if (translate.error) throw new Error(translate.error.message);

        translate = translate[0];
        if (!lang.from) lang.from = translate.detectedLanguage.language;
        return {
            lang,
            word,
            text: translate.translations[0].text,
            candidate: translate.translations.slice(1).map(t => t.text)
        };
    } catch (err) {
        throw err;
    }      
}

module.exports = Object.assign(async (word, { from, to }) => {
    let lang = {
        from: from,
        to: to || 'zh'
    };

    return await translate(word, lang);
}, {
    auto: 'auto', 
    af: 'af', ar: 'ar', bg: 'bg', bn: 'bn', bs: 'bs', ca: 'ca', cs: 'cs', cy: 'cy', da: 'da', 
    de: 'de', el: 'el', en: 'en', es: 'es', et: 'et', fa: 'fa', fi: 'fi', fr: 'fr', he: 'he', 
    hi: 'hi', hr: 'hr', ht: 'ht', hu: 'hu', id: 'id', is: 'is', it: 'it', ja: 'ja', ko: 'ko', 
    lt: 'lt', lv: 'lv', ms: 'ms', mt: 'mt', mww: 'mww', nb: 'nb', nl: 'nl', pl: 'pl', pt: 'pt', 
    ro: 'ro', ru: 'ru', sk: 'sk', sl: 'sl', 'sr-Latn': 'sr-Latn', sv: 'sv', sw: 'sw', ta: 'ta', 
    th: 'th', 'tlh-Latn': 'tlh-Latn', tr: 'tr', uk: 'uk', ur: 'ur', vi: 'vi', 
    'zh-Hans': 'zh-Hans', 'zh-Hant': 'zh-Hant', zh: 'zh', 'zh-TW': 'zh-TW', 'zh-CN': 'zh-CN'
});
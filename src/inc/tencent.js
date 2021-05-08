/* eslint-disable */
const got = require('got');

async function translate(word, lang) {
    let url = `https://fanyi.qq.com/api/translate`;
    let rsp;

    if (!support(lang.from, lang.to)) throw new Error(`Not support tranlate to language '${lang.to}' from '${lang.from}'`);

    try {
        rsp = await got.get('https://fanyi.qq.com/');

        let qtk = rsp.body.match(/qtk\s*=\s*"([^']*?)";/) || undefined;
        if (qtk) qtk = qtk[1];

        let qtv = rsp.body.match(/qtv\s*=\s*"([^']*?)";/) || undefined;
        if (qtv) qtv = qtv[1];

        let form = {
            source: lang.from,
            target: lang.to,
            sourceText: word,
            qtk, qtv, 
            sessionUuid: 'translate_uuid' + new Date().getTime(),
        }

        rsp = await got.post(url, {
            form,
            throwHttpErrors: false,
            headers: {
                Origin: 'https://fanyi.qq.com',
                Referer: 'https://fanyi.qq.com/',
                'User-Agent': 'Mozilla/5.0 (Linux; Android 5.0; SM-G900P Build/LRX21T) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/69.0.3497.100 Mobile Safari/537.36'
            }
        });

        let data = JSON.parse(rsp.body);
        let result = [];
        if (data.translate.records.length == 1) {
            result = data.translate.records[0].targetText.split('/').map(t => t.trim())
        } else {
            result = [ data.translate.records.map(r => r.targetText).join('') ];
        }

        let candidate = result.slice(1);
        result = result[0];

        lang.from = data.translate.source;
        lang.to = data.translate.target;
        
        return {
            lang,
            word,
            text: result,
            candidate
        };
    } catch (err) {
        throw new Error(`Translate failed, Error message: '${err.message}'. Please post an issues for me.`);
    }      
}

function support(from, to) {
    let support = {
        auto: ['zh', 'en', 'jp', 'kr', 'fr', 'es', 'it', 'de', 'tr', 'ru', 'pt', 'vi', 'id', 'th', 'ms'],
        en: ['zh', 'fr', 'es', 'it', 'de', 'tr', 'ru', 'pt', 'vi', 'id', 'th', 'ms', 'ar', 'hi'],
        zh: ['en', 'jp', 'kr', 'fr', 'es', 'it', 'de', 'tr', 'ru', 'pt', 'vi', 'id', 'th', 'ms'],
        fr: ['zh', 'en', 'es', 'it', 'de', 'tr', 'ru', 'pt'],
        es: ['zh', 'en', 'fr', 'it', 'de', 'tr', 'ru', 'pt'],
        it: ['zh', 'en', 'fr', 'es', 'de', 'tr', 'ru', 'pt'],
        de: ['zh', 'en', 'fr', 'es', 'it', 'tr', 'ru', 'pt'],
        tr: ['zh', 'en', 'fr', 'es', 'it', 'de', 'ru', 'pt'],
        ru: ['zh', 'en', 'fr', 'es', 'it', 'de', 'tr', 'pt'],
        pt: ['zh', 'en', 'fr', 'es', 'it', 'de', 'tr', 'ru'],
        vi: ['zh', 'en'],
        id: ['zh', 'en'],
        ms: ['zh', 'en'],
        th: ['zh', 'en'],
        jp: ['zh'],
        kr: ['zh'],
        ar: ['en'],
        hi: ['en']
    }

    if (!to) {
        let lang = {};
        if(support[from]) support[from].forEach(s => lang[s] = s);
        return lang;
    }

    return !!(support[from] && support[from].indexOf(to) >= 0);
}

module.exports = Object.assign(async (word, { from, to }) => {
    let lang = {
        from: from || 'auto',
        to: to || 'zh'
    };

    return await translate(word, lang);
}, {
    auto: 'auto', zh: 'zh', en: 'eg', jp: 'hp', kr: 'kr', fr: 'fr', es: 'es', it: 'it',
    de: 'de', tr: 'tr', ru: 'ru', pt: 'pt', vi: 'vi', id: 'id', th: 'th', ms: 'ms',
    ar: 'ar', hi: 'hi', support
});
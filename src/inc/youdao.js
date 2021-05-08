/* eslint-disable */
const got = require('got');
const crypto = require('crypto');

const userAgent = 'Mozilla/5.0 (Linux; Android 5.0; SM-G900P Build/LRX21T) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/69.0.3497.100 Mobile Safari/537.36';

function md5(text) {
    let md5 = crypto.createHash('md5');
    return md5.update(text.toString()).digest('hex');
}

function SaltSign(word) {
    let ts = new Date().getTime().toString()
      , salt = ts + parseInt(10 * Math.random(), 10);
    return {
        ts,
        bv: md5(userAgent),
        salt,
        sign: md5('fanyideskweb' + word + salt + 'Nw(nmmbP%A-r6U3EUn]Aj')
    }
}

async function translate(word, lang) {
    let url = 'http://fanyi.youdao.com/translate_o?smartresult=dict&smartresult=rule'
    let req;

    try {
        let s = SaltSign(word);
        let form = {
            i: word,
            from: lang.from,
            to: lang.to,
            smartresult: 'dict',
            client: 'fanyideskweb',
            salt: s.salt,
            sign: s.sign,
            ts: s.ts,
            bv: s.bv,
            doctype: 'json',
            version: 2.1,
            keyfrom: 'fanyi.web',
            action: 'FY_BY_REALTlME'
        };

        req = await got.post(url, {
            form,
            headers: {
                'User-Agent': userAgent,
                Cookie: 'OUTFOX_SEARCH_USER_ID=-708015371@10.169.0.82;',
                Referer: 'http://fanyi.youdao.com/',
            }
        })
        let translate = JSON.parse(req.body);

        if (lang.from == 'AUTO') lang.from = translate.type.split('2')[0];
        if (lang.to == 'AUTO') lang.from = translate.type.split('2')[1];

        let result = translate.translateResult.map(r => r.map(t => t.tgt).join('')).join('\n');
        let candidate = translate.smartResult ? translate.smartResult.entries.filter(t => !!t) : [];
        candidate = candidate.concat(translate.translateResult.slice(1).map(t => t.tgt));
        return {
            lang,
            text: result,
            word: word,
            candidate
        };
    } catch (err) {
        throw err;
    }      
}

module.exports = Object.assign(async (word, { from, to }) => {
    let lang = {
        from: from || 'AUTO',
        to: to || 'zh'
    };

    return await translate(word, lang);
}, {
    auto: 'AUTO', zh: 'zh-CHS', en: 'en', ja: 'ja', ko: 'ko', fr: 'fr', 
    de: 'de', ru: 'ru', es: 'es', pt: 'pt', it: 'it', vi: 'vi', id: 'id', ar: 'ar'
});
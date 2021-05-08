/* eslint-disable */
const got = require('got');

let tkk = '429175.1243284773';

// Get Tkk value
(async () => {
    let url = 'https://translate.google.cn/';
    let req = await got.get(url);
    let body = req.body;
    let tkkMat = body.match && body.match(/tkk:'([\d.]+)'/);
    tkk = tkkMat ? tkkMat[1] : tkk;
})();

function Ho (a) {
    return function() {
        return a;
    };
}

function Io(a, b) {
    for (var c = 0; c < b.length - 2; c += 3) {
        var d = b.charAt(c + 2);
        d = 'a' <= d ? d.charCodeAt(0) - 87 : Number(d);
        d = '+' == b.charAt(c + 1) ? a >>> d : a << d;
        a = '+' == b.charAt(c) ? a + d & 4294967295 : a ^ d;
    }
    return a;
}

// translate_m_zh-CN.js:formatted Line 8099 fun Ko
function tk(a, tkk) {
    var b = tkk || '';
    var d = Ho(String.fromCharCode(116));
    var c = Ho(String.fromCharCode(107));
    d = [d(), d()];
    d[1] = c();
    c = '&' + d.join('') + '=';
    d = b.split('.');
    b = Number(d[0]) || 0;
    for (var e = [], f = 0, g = 0; g < a.length; g++) {
        var k = a.charCodeAt(g);
        128 > k ? e[f++] = k : (2048 > k ? e[f++] = k >> 6 | 192 : (55296 == (k & 64512) && g + 1 < a.length && 56320 == (a.charCodeAt(g + 1) & 64512) ? (k = 65536 + ((k & 1023) << 10) + (a.charCodeAt(++g) & 1023),
        e[f++] = k >> 18 | 240,
        e[f++] = k >> 12 & 63 | 128) : e[f++] = k >> 12 | 224,
        e[f++] = k >> 6 & 63 | 128),
        e[f++] = k & 63 | 128);
    }
    a = b;
    for (f = 0; f < e.length; f++)
        {a += e[f],
        a = Io(a, '+-a^+6');}
    a = Io(a, '+-3^+b+-f');
    a ^= Number(d[1]) || 0;
    0 > a && (a = (a & 2147483647) + 2147483648);
    a %= 1E6;
    return c + (a.toString() + '.' + (a ^ b));
};

function getCandidate(tran) {
    let words = [];
    if (tran[1]) {words = words.concat(tran[1][0][1]);};
    if (tran[5]) {
        let candidates = tran[5].map(tt => (tt[2] || [tt[0]]).map(t => t[0]));
        let maxLength = Math.max(...candidates.map(c => c.length));
        for (let i = 0; i < maxLength; i++) {
            words.push(candidates.map(c => c[i] || c[c.length - 1]).join(''));
        }
    }
    return words;
}

async function translate(word, lang) {
    let url = `https://translate.google.cn/translate_a/single?client=webapp&sl=${lang.from}&tl=${lang.to}&hl=zh-CN&dt=at&dt=bd&dt=ex&dt=ld&dt=md&dt=qca&dt=rw&dt=rm&dt=ss&dt=t&pc=1&otf=1&ssel=0&tsel=0&kc=1&tk=${tk(word, tkk)}&q=${encodeURIComponent(word)}`;

    try {
        let req = await got.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Linux; Android 5.0; SM-G900P Build/LRX21T) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/69.0.3497.100 Mobile Safari/537.36'
            }
        });
        let translate = JSON.parse(req.body);
        let candidate = getCandidate(translate);
        translate[0].pop();
        if (lang.from == 'auto') {lang.from = translate[2];}
        return {
            lang,
            word,
            text: translate[0].map(t => t[0]).join(''),
            candidate
        };
    } catch (err) {
        throw new Error(`Translate failed, Error message: '${err.message}'. Please post an issues for me.`);
    }      
}

module.exports = Object.assign(async (word, { from, to }) => {
    let lang = {
        from: from || 'auto',
        to: to || 'zh'
    };

    return await translate(word, lang);
}, {
    auto: 'auto', 
    sq: 'sq', ar: 'ar', am: 'am', az: 'az', ga: 'ga', et: 'et', or: 'or', eu: 'eu', 
    be: 'be', bg: 'bg', is: 'is', pl: 'pl', bs: 'bs', fa: 'fa', af: 'af', tt: 'tt', 
    da: 'da', de: 'de', ru: 'ru', fr: 'fr', tl: 'tl', fi: 'fi', fy: 'fy', km: 'km', 
    ka: 'ka', gu: 'gu', kk: 'kk', ht: 'ht', ko: 'ko', ha: 'ha', nl: 'nl', ky: 'ky', 
    gl: 'gl', ca: 'ca', cs: 'cs', kn: 'kn', co: 'co', hr: 'hr', ku: 'ku', la: 'la', 
    lv: 'lv', lo: 'lo', lt: 'lt', lb: 'lb', rw: 'rw', ro: 'ro', mg: 'mg', mt: 'mt', 
    mr: 'mr', ml: 'ml', ms: 'ms', mk: 'mk', mi: 'mi', mn: 'mn', bn: 'bn', my: 'my', 
    hmn: 'hmn', xh: 'xh', zu: 'zu', ne: 'ne', no: 'no', pa: 'pa', pt: 'pt', ps: 'ps', 
    ny: 'ny', ja: 'ja', sv: 'sv', sm: 'sm', sr: 'sr', st: 'st', si: 'si', eo: 'eo', 
    sk: 'sk', sl: 'sl', sw: 'sw', gd: 'gd', ceb: 'ceb', so: 'so', tg: 'tg', te: 'te', 
    ta: 'ta', th: 'th', tr: 'tr', tk: 'tk', cy: 'cy', ug: 'ug', ur: 'ur', uk: 'uk', 
    uz: 'uz', es: 'es', iw: 'iw', el: 'el', haw: 'haw', sd: 'sd', hu: 'hu', sn: 'sn', 
    hy: 'hy', ig: 'ig', it: 'it', yi: 'yi', hi: 'hi', su: 'su', id: 'id', jw: 'jw', 
    en: 'en', yo: 'yo', vi: 'vi', 'zh-TW': 'zh-TW', 'zh-CN': 'zh-CN', zh: 'zh',
    'zh-Hans': 'zh-Hans', 'zh-Hant': 'zh-Hant', 
});
/* eslint-disable */
const got = require('got');
const {CookieJar} = require('tough-cookie');

function n(r, o) {
    for (var t = 0; t < o.length - 2; t += 3) {
        var a = o.charAt(t + 2);
        a = a >= "a" ? a.charCodeAt(0) - 87 : Number(a),
        a = "+" === o.charAt(t + 1) ? r >>> a : r << a,
        r = "+" === o.charAt(t) ? r + a & 4294967295 : r ^ a
    }
    return r
}

function signed(r, gtk) {
    var o = r.match(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g);
    if (null === o) {
        var t = r.length;
        t > 30 && (r = '' + r.substr(0, 10) + r.substr(Math.floor(t / 2) - 5, 10) + r.substr(-10, 10))
    } else {
        for (var e = r.split(/[\uD800-\uDBFF][\uDC00-\uDFFF]/), C = 0, h = e.length, f = []; h > C; C++)
            '' !== e[C] && f.push.apply(f, a(e[C].split(''))),
            C !== h - 1 && f.push(o[C]);
        var g = f.length;
        g > 30 && (r = f.slice(0, 10).join('') + f.slice(Math.floor(g / 2) - 5, Math.floor(g / 2) + 5).join('') + f.slice(-10).join(''))
    }
    var u = void 0
      , l = '' + String.fromCharCode(103) + String.fromCharCode(116) + String.fromCharCode(107);
    u = gtk || '';
    for (var d = u.split('.'), m = Number(d[0]) || 0, s = Number(d[1]) || 0, S = [], c = 0, v = 0; v < r.length; v++) {
        var A = r.charCodeAt(v);
        128 > A ? S[c++] = A : (2048 > A ? S[c++] = A >> 6 | 192 : (55296 === (64512 & A) && v + 1 < r.length && 56320 === (64512 & r.charCodeAt(v + 1)) ? (A = 65536 + ((1023 & A) << 10) + (1023 & r.charCodeAt(++v)),
        S[c++] = A >> 18 | 240,
        S[c++] = A >> 12 & 63 | 128) : S[c++] = A >> 12 | 224,
        S[c++] = A >> 6 & 63 | 128),
        S[c++] = 63 & A | 128)
    }
    for (var p = m, F = '' + String.fromCharCode(43) + String.fromCharCode(45) + String.fromCharCode(97) + ('' + String.fromCharCode(94) + String.fromCharCode(43) + String.fromCharCode(54)), D = '' + String.fromCharCode(43) + String.fromCharCode(45) + String.fromCharCode(51) + ('' + String.fromCharCode(94) + String.fromCharCode(43) + String.fromCharCode(98)) + ('' + String.fromCharCode(43) + String.fromCharCode(45) + String.fromCharCode(102)), b = 0; b < S.length; b++)
        p += S[b],
        p = n(p, F);
    return p = n(p, D),
    p ^= s,
    0 > p && (p = (2147483647 & p) + 2147483648),
    p %= 1e6,
    p.toString() + '.' + (p ^ m)
}

async function translate(word, lang) {
    let url = 'https://fanyi.baidu.com/translate'
    let req;

    try {
        let cookieJar = new CookieJar();

        const compatCookieJar = {
            setCookie: (rawCookie, url) =>
                new Promise((resolve, reject) =>
                    cookieJar.setCookie(rawCookie, url, (err, value) =>
                        err ? reject(err) : resolve(value)
                    )
                ),
            getCookieString: async (url) =>
                new Promise((resolve, reject) =>
                    cookieJar.getCookieString(url, (err, value) =>
                        err ? reject(err) : resolve(value)
                    )
                )
        }

        req = await got.get(url, {
            cookieJar: compatCookieJar,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Linux; Android 5.0; SM-G900P Build/LRX21T) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/69.0.3497.100 Mobile Safari/537.36'
            }
        });

        // Request homepage twice or there will be a cookie error.
        req = await got.get(url, {
            cookieJar: compatCookieJar,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Linux; Android 5.0; SM-G900P Build/LRX21T) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/69.0.3497.100 Mobile Safari/537.36'
            }
        });

        let token = req.body.match(/token: '(\w+)',/)[1];
        let gtk = req.body.match(/window.gtk = '([\d.]+)'/);
        if(!gtk) gtk = req.body.match(/gtk: '([\d.]+)'/);
        gtk = gtk[1];

        let sign = signed(word, gtk);
        if (!lang.from || lang.from == 'auto') {
            url = 'https://fanyi.baidu.com/langdetect'
            req = await got.post(url, {
                form: { query: word },
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Linux; Android 5.0; SM-G900P Build/LRX21T) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/69.0.3497.100 Mobile Safari/537.36'
                }
            });
            lang.from = JSON.parse(req.body).lan;
        }
        url = `https://fanyi.baidu.com/v2transapi?from=${lang.from}&to=${lang.to}`
        req = await got.post(url, {
            form: {
                from: lang.from,
                to: lang.to,
                query: word,
                transtype: 'realtime',
                simple_means_flag: 3,
                sign,
                token,
                domain: 'common'
            },
            cookieJar: compatCookieJar,
            throwHttpErrors: false,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Linux; Android 5.0; SM-G900P Build/LRX21T) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/69.0.3497.100 Mobile Safari/537.36'
            }
        });
        let translate = JSON.parse(req.body);
        if (translate.error) throw new Error('Translate Failed, Baidu Error Code:' + translate.error);

        let result = translate.trans_result.data.map(d => d.dst).join('\n');
        let candidate = translate.dict_result ? translate.dict_result.simple_means.word_means : [];

        return {
            lang,
            word,
            text: result,
            candidate
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
    ara: 'ara', est: 'est', bul: 'bul', pl: 'pl', dan: 'dan', de: 'de', 
    ru: 'ru', fra: 'fra', fin: 'fin', kor: 'kor', nl: 'nl', cs: 'cs', 
    rom: 'rom', pt: 'pt', jp: 'jp', swe: 'swe', slo: 'slo', th: 'th', 
    wyw: 'wyw', spa: 'spa', el: 'el', hu: 'hu', zh: 'zh', en: 'en', 
    it: 'it', vie: 'vie', yue: 'yue', cht: 'cht'
});
const require2 = require('tomjs/handlers/require2');
const svgCaptcha = require2('svg-captcha');
const randomize = require2('randomatic');
const cfg = require2('tomjs/configs')();
const Cache = require2('tomjs/cache');
let captcha_cache = Cache(cfg.captcha.cache_name,cfg.captcha.cache_options);

module.exports = async function(cache_name) {
    if (!cache_name) {
        cache_name = 'captcha';
    }
    let data = svgCaptcha.create(cfg.captcha.options);

    data.key = randomize('Aa0',cfg.captcha.cache_key_length, { exclude: '0oOiIlL1' });
    await captcha_cache.set(cache_name + ":" + data.key, data.text.toLowerCase());
    if (cfg.system.NODE_ENV.trim().toLowerCase() != 'development') { delete data.text; }

    return data;
};
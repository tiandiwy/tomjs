const require2 = require('tomjs/handlers/require2');
const { isObject, isNumber } = require2('tomjs/handlers/base_tools');
const Cache = require2('tomjs/cache');
const def_cache = Cache();

//ttl小于等于0 表示不使用缓存 方便用户动态决定是否用缓存
module.exports = async function (key, ttl = 0, fn = async () => { }, cache_obj) {
    ttl = isNumber(ttl) ? ttl : 0;
    const cache = isObject(cache_obj) ? cache_obj : def_cache;
    if (ttl <= 0) {
        return await fn(key, ttl, cache);
    }

    let result = await cache.get(key);
    if (result === null) {
        result = await fn(key, ttl, cache);
        await cache.set(key, result, ttl);
    }
    return result;
}
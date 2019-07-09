const require2 = require('tomjs/handlers/require2');
const ratelimit_cfg = require2('tomjs/configs')().ratelimit;
const BaseApiError = require2('tomjs/error/base_api_error')
const ratelimit = require2('koa-ratelimit');
const Redis = require2('ioredis');
const { isArray } = require2('tomjs/handlers/tools');
const getTime = require2('tomjs/handlers/gettimes');

let default_redis = undefined; //默认redis连接

module.exports = function(ratelimit_name = 'default') {
    let opts = ratelimit_cfg[ratelimit_name].options;
    if (ratelimit_cfg[ratelimit_name].redis_cfg) {
        opts.db = new Redis(ratelimit_cfg[ratelimit_name].redis_cfg);
    } else {
        if (default_redis === undefined) {
            default_redis = new Redis(ratelimit_cfg['default'].redis_cfg);
        }
        opts.db = default_redis;
    }
    if (opts.duration) {
        opts.duration = getTime(opts.duration, 60000, true);
    }
    let blacklist = [];
    let blacklist_if_fn = false;
    if (isArray(ratelimit_cfg[ratelimit_name].blacklist)) {
        blacklist = ratelimit_cfg[ratelimit_name].blacklist;
    } else if (typeof(ratelimit_cfg[ratelimit_name].blacklist) == 'string') {
        blacklist = ratelimit_cfg[ratelimit_name].blacklist.split(',');
    }else if (typeof(ratelimit_cfg[ratelimit_name].blacklist) == "function") {
        blacklist = ratelimit_cfg[ratelimit_name].blacklist;
        blacklist_if_fn = true;
    }
    let whitelist = [];
    let whitelist_if_fn = false;
    if (isArray(ratelimit_cfg[ratelimit_name].whitelist)) {
        whitelist = ratelimit_cfg[ratelimit_name].whitelist;
    } else if (typeof(ratelimit_cfg[ratelimit_name].whitelist) == 'string') {
        whitelist = ratelimit_cfg[ratelimit_name].whitelist.split(',');
    }else if (typeof(ratelimit_cfg[ratelimit_name].whitelist) == "function") {
        whitelist = ratelimit_cfg[ratelimit_name].whitelist;
        whitelist_if_fn = true
    }

    let fn_ratelimit = ratelimit(opts);
    return async function(ctx, next) {
        let isBlack = false;
        if (blacklist_if_fn) {
            isBlack = await blacklist(ctx, ctx.ip);
        }else{
            isBlack = blacklist.indexOf(ctx.ip) >= 0;
        }
        if (isBlack) {
            if (ratelimit_cfg[ratelimit_name].options.throw) {
                ctx.throw(BaseApiError.TOO_MANY_REQUESTS_ERROR,
                    ctx.__(opts.errorMessage) || BaseApiError.Translate(ctx.lang, 'TOO_MANY_REQUESTS_ERROR'));
            } else {
                throw new BaseApiError(BaseApiError.TOO_MANY_REQUESTS_ERROR);
            }
            return;
        }

        let isWhite = false;
        if (whitelist_if_fn) {
            isWhite = await whitelist(ctx, ctx.ip);
        }else{
            isWhite = whitelist.indexOf(ctx.ip) >= 0;
        }
        if (isWhite) {
            await next();
        } else {
            await fn_ratelimit(ctx, next);
            if (ctx.status == 429) {
                throw new BaseApiError(BaseApiError.TOO_MANY_REQUESTS_ERROR);
            }
        }
    };
}
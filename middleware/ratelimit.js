const require2 = require('tomjs/handlers/require2');
const ratelimit_cfg = require2('tomjs/configs')().ratelimit;
const BaseApiError = require2('tomjs/error/base_api_error');
const buildRedis = require2('tomjs/handlers/build_redis');
const ipchecker = require('ipchecker');
const ratelimit = require2('koa-ratelimit');
const b_ratelimit = require2('tomjs-koa-better-ratelimit');
const async_ratelimiter = require2('async-ratelimiter');
const { isArray, isFunction, clone } = require2('tomjs/handlers/base_tools');
const getTime = require2('tomjs/handlers/gettimes');

let allRatelimit = {};

module.exports = function (ratelimit_name = 'default') {
    if (allRatelimit[ratelimit_name]) { return allRatelimit[ratelimit_name]; }

    let isRedis = true;

    let opts = clone(ratelimit_cfg[ratelimit_name].options);
    if (!isFunction(opts.id)) {
        if (!opts.prefixKey) { opts.prefixKey = ratelimit_name; }
        opts.id = (ctx) => opts.prefixKey + ' ' + ctx.ip;
    }
    if (ratelimit_cfg[ratelimit_name].redis) {
        opts.db = buildRedis(ratelimit_cfg[ratelimit_name].redis);
    } else {
        isRedis = false;
        opts.accessLimited = opts.errorMessage;
        opts.accessForbidden = ratelimit_cfg[ratelimit_name].blackMessage;
    }
    if (opts.duration) {
        opts.duration = getTime(opts.duration, 60000, true);
    }
    if (opts.clear_interval) {
        opts.clear_interval = getTime(opts.clear_interval, 60000, true);
    }
    let blacklist = [];
    let blacklist_if_fn = false;
    if (isArray(ratelimit_cfg[ratelimit_name].blacklist)) {
        blacklist = ratelimit_cfg[ratelimit_name].blacklist;
    } else if (typeof (ratelimit_cfg[ratelimit_name].blacklist) == 'string') {
        blacklist = ratelimit_cfg[ratelimit_name].blacklist.split(',');
    } else if (typeof (ratelimit_cfg[ratelimit_name].blacklist) == "function") {
        blacklist = ratelimit_cfg[ratelimit_name].blacklist;
        blacklist_if_fn = true;
    }

    let whitelist = [];
    let whitelist_if_fn = false;
    if (isArray(ratelimit_cfg[ratelimit_name].whitelist)) {
        whitelist = ratelimit_cfg[ratelimit_name].whitelist;
    } else if (typeof (ratelimit_cfg[ratelimit_name].whitelist) == 'string') {
        whitelist = ratelimit_cfg[ratelimit_name].whitelist.split(',');
    } else if (typeof (ratelimit_cfg[ratelimit_name].whitelist) == "function") {
        whitelist = ratelimit_cfg[ratelimit_name].whitelist;
        whitelist_if_fn = true
    }

    let blackCheck = undefined;
    if (!blacklist_if_fn) {
        blackCheck = ipchecker.create(blacklist);
    }

    let whiteCheck = undefined;
    if (!whitelist_if_fn) {
        whiteCheck = ipchecker.create(whitelist);
    }

    let fn_ratelimit = undefined;
    let limiter = undefined;
    if (isRedis) {
        fn_ratelimit = ratelimit(opts);
        limiter = new async_ratelimiter(opts);
    }
    else { fn_ratelimit = b_ratelimit(opts); }

    let web = async function (ctx, next) {
        let isBlack = false;
        if (blacklist_if_fn) {
            isBlack = await blacklist(ctx.ip, ctx);
        } else if (blackCheck) {
            isBlack = blackCheck(ctx.ip);
        }
        if (isBlack) {
            if (ratelimit_cfg[ratelimit_name].options.show_api_error) {
                ctx.throw(BaseApiError.TOO_MANY_REQUESTS_ERROR,
                    ctx.__(isRedis ? ratelimit_cfg[ratelimit_name].blackMessage : opts.accessForbidden) || BaseApiError.Translate(ctx.lang, isRedis ? ratelimit_cfg[ratelimit_name].blackMessage : opts.accessForbidden));
            } else {
                //throw new BaseApiError(BaseApiError.TOO_MANY_REQUESTS_ERROR, isRedis ? ratelimit_cfg[ratelimit_name].blackMessage : opts.accessForbidden);
            }
            return;
        }

        let isWhite = false;
        if (whitelist_if_fn) {
            isWhite = await whitelist(ctx.ip, ctx);
        } else if (whiteCheck) {
            isWhite = whiteCheck(ctx.ip);
        }
        if (isWhite) {
            await next();
        } else {
            await fn_ratelimit(ctx, next);
            if ((ctx.status == 429) && ratelimit_cfg[ratelimit_name].options.show_api_error) {
                throw new BaseApiError(BaseApiError.TOO_MANY_REQUESTS_ERROR);
            }
        }
    };
    let websocket = async function (ctx, next) {
        if (!isFunction(next)) { next = () => { return true; }; }
        let isBlack = false;
        if (blacklist_if_fn) {
            isBlack = await blacklist(ctx.ip, ctx);
        } else if (blackCheck) {
            isBlack = blackCheck(ctx.ip);
        }
        if (isBlack) {
            throw new BaseApiError(BaseApiError.TOO_MANY_REQUESTS_ERROR, ratelimit_cfg[ratelimit_name].blackMessage, ctx.ip);
        }

        let isWhite = false;
        if (whitelist_if_fn) {
            isWhite = await whitelist(ctx.ip, ctx);
        } else if (whiteCheck) {
            isWhite = whiteCheck(ctx.ip);
        }
        if (!isWhite) {
            let end = {};
            if (isRedis) {
                let id = isFunction(opts.id) ? opts.id(ctx) : ctx.ip;
                let limit = await limiter.get({ id });
                end = !limit.remaining ? { ip: id, reset: limit.reset, limit: 0 } : true;
            }
            else {
                end = await fn_ratelimit(ctx, () => { return true; });
            }
            if (end !== true) {
                throw new BaseApiError(BaseApiError.TOO_MANY_REQUESTS_ERROR, opts.errorMessage, end);
            }

        }
        return await next();
    };
    allRatelimit[ratelimit_name] = { web, websocket };
    return allRatelimit[ratelimit_name];
}
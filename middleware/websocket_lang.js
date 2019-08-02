const require2 = require('tomjs/handlers/require2');
const system_cfg = require2('tomjs/configs')().system;
const Events = require2('tomjs/handlers/events');

module.exports = async function (ctx, next) {
    let fn = function () {
        return ctx.query[system_cfg.lang_cookie_key];
    };
    ctx.getLocaleFromQuery = fn;
    ctx.getLocaleFromCookie = fn;
    ctx.getLocaleFromHeader = fn;
    return next();
};

const require2 = require('tomjs/handlers/require2');
const { isObject } = require2('tomjs/handlers/tools');
const auth_cfg = require2('tomjs/configs')().auth;
const { sign, decode } = require2('tomjs/handlers/jwt-sign');
module.exports = function (ctx, info, long) {
    let token_obj = undefined;
    if (typeof (info) == 'function') {
        token_obj = info();
    } else {
        token_obj = info;
    }
    if (!isObject(token_obj)) {
        throw new BaseApiError(BaseApiError.JWT_ERROR, 'token info is not object');
    }

    let token = sign(token_obj, long);
    ctx.state[auth_cfg.jwt_key] = token_obj;
    ctx.state[auth_cfg.jwt_tokenkey] = token;
    if (isObject(ctx.websocket)) {
        if (isObject(ctx.websocket.servers)) {
            ctx.websocket.servers.addUser(ctx);
        }
    }
    if (auth_cfg.jwt_cookie) {
        let exp = token_obj.exp;
        ctx.cookies.set(auth_cfg.jwt_cookie, token, { path: '/', expires: new Date(exp * 1000) });
    }
    return token;
}
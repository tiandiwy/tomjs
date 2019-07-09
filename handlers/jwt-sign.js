const require2 = require('tomjs/handlers/require2');
const jwt = require2('jsonwebtoken');
const verify = require2('koa-jwt/lib/verify');
const configs = require2('tomjs/configs')();
const publicKey = require2('tomjs/handlers/load-secret-key');
const { isArray, toBool } = require2('tomjs/handlers/tools');

exports.sign = (auth_info, long) => {
    let opt = {
        'expiresIn': toBool(long) ? configs.auth.jwt_expiresin_long : configs.auth.jwt_expiresin,
    };
    if (typeof(configs.auth.jwt_notBefore) == "string") {
        if (configs.auth.jwt_notBefore.length > 0) {
            opt['notBefore'] = configs.auth.jwt_notBefore;
        }
    }
    if (typeof(configs.auth.jwt_audience) == "string" || isArray(configs.auth.jwt_audience)) {
        opt['audience'] = configs.auth.jwt_audience;
    }
    if (typeof(configs.auth.jwt_issuer) == "string" || isArray(configs.auth.jwt_issuer)) {
        opt['issuer'] = configs.auth.jwt_issuer;
    }
    auth_info[configs.auth.jwt_key_exp_is_long] = toBool(long) ? true:false;
    return jwt.sign(auth_info, publicKey, opt);
}

exports.verify = async(token, opts) => {
    try {
        return await verify(token, publicKey, opts);
    } catch (e) { return undefined; }
}

exports.decode = (token, opts) => {
    return jwt.decode(token, opts);
}

exports.getToken = (ctx) => {
    if (typeof(ctx.header.authorization) == 'string') {
        return ctx.header.authorization.substr(7);
    }
    return undefined;
}

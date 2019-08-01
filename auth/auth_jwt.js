const require2 = require('tomjs/handlers/require2');
const koa_jwt = require2('koa-jwt');
const publicKey = require2('tomjs/handlers/load-secret-key');
const path = require2('path');
const appdir = require2('tomjs/handlers/dir')();
const { isArray, isObject } = require2('tomjs/handlers/tools');
const auth_cfg = require2('tomjs/configs')().auth;
const auth_unless = require2('tomjs/configs')().auth_unless;
const build_token = require2('tomjs/handlers/build_token');
const getTime = require2('tomjs/handlers/gettimes');
const log4js = require2('tomjs/handlers/log4js');
const BaseApiError = require2('tomjs/error/base_api_error');
let authLog = console;
if (typeof(auth_cfg.log4js_category) && (auth_cfg.log4js_category.length > 0)) {
    authLog = log4js.getLogger(auth_cfg.log4js_category);
}

let userIsRevoked = undefined;
try {
    userIsRevoked = require(path.join(appdir, './auth/jwt_isrevoked'));
} catch (error) { userIsRevoked = undefined; }

let opt = {
    secret: publicKey,
    key: auth_cfg.jwt_key,
    tokenKey: auth_cfg.jwt_tokenKey,
    cookie: auth_cfg.jwt_cookie,
    passthrough: auth_cfg.jwt_auth_all_path,
    getToken: (ctx) => {
        if (isObject(ctx.websocket)) {
            if (ctx.query && ctx.query.Authorization) {
                const parts = ctx.query.Authorization.split(' ');
                if (parts.length === 2) {
                    const scheme = parts[0];
                    const credentials = parts[1];

                    if (/^Bearer$/i.test(scheme)) {
                        return credentials;
                    }
                }
            }
            ctx.ws_error_send(new BaseApiError(BaseApiError.UNAUTHORIZED, 'Bad Authorization query format. Format is "[url]?Authorization=Bearer <token>"',ctx.query));
            ctx.websocket.terminate();
        }
        else {
            return false;
        }
    },
    isRevoked: async(ctx, decodedToken, token) => {

        //写入token相关信息
        ctx.state[auth_cfg.jwt_key] = decodedToken;
        ctx.state[auth_cfg.jwt_tokenkey] = token;
        
        let re = false;
        if (auth_cfg.jwt_key_check_token_version) {
            try {
                const UserModel = require(auth_cfg.auth_model);
                let users = UserModel.Model();
                let user = await users.findById(decodedToken[auth_cfg.jwt_key_id]);
                if (user !== null) {
                    re = (parseInt(user[auth_cfg.jwt_key_token_version], 10) != parseInt(decodedToken[auth_cfg.jwt_key_token_version], 10));
                } else { re = true; }
            } catch (e) { re = true; }
        }
        if (!re && (typeof(userIsRevoked) == "function")) {
            re = await userIsRevoked(ctx, decodedToken, token); //获取用户自定义isRevoked结果
        }
        if (!re &&
            auth_cfg.jwt_rewirte_cookie &&
            auth_cfg.jwt_cookie &&
            isObject(ctx.state)) {
            let times = decodedToken[auth_cfg.jwt_key_exp_is_long] ? getTime(auth_cfg.jwt_rewirte_cookie_remaining_long, 86400) : getTime(auth_cfg.jwt_rewirte_cookie_remaining, 1800);
            if ((decodedToken.exp - new Date()
                    .getTime() / 1000 - times) <= 0) {
                if (!isObject(ctx.state[auth_cfg.jwt_key])) {
                    const dels = ['iat', 'exp', 'iss', 'nbf', 'aud', 'sub']; //需要排除的属性
                    let obj = Object.assign({}, decodedToken);
                    let len = dels.length;
                    for (let i = 0; i < len; i++) {
                        if (obj[dels[i]]) { delete obj[dels[i]]; }
                    }
                    ctx.state[auth_cfg.jwt_key] = obj;
                }
                let user_token_obj = ctx.state[auth_cfg.jwt_key];
                build_token(ctx, user_token_obj, user_token_obj[auth_cfg.jwt_key_exp_is_long]);
                authLog.info('User ReToken By Cookie Auto', ctx.state[auth_cfg.jwt_key]);
            }
        }
        return re;
    },
};
if (typeof(auth_cfg.jwt_audience) == "string" || isArray(auth_cfg.jwt_audience)) {
    opt['audience'] = auth_cfg.jwt_audience;
}
if (typeof(auth_cfg.jwt_issuer) == "string" || isArray(auth_cfg.jwt_issuer)) {
    opt['issuer'] = auth_cfg.jwt_issuer;
}

module.exports = (type = 'web')=>{
    if (auth_cfg.jwt_auth_all_path) {
        return koa_jwt(opt);
    } else {
        return koa_jwt(opt).unless(auth_unless[type]);
    }
};
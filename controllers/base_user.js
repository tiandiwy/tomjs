const require2 = require('tomjs/handlers/require2');
const auth_cfg = require2('tomjs/configs')().auth;
const system_cfg = require2('tomjs/configs')().system;
const session_cfg = require2('tomjs/configs')().session;
const { isObject, isString } = require2('tomjs/handlers/tools');
const build_token = require2('tomjs/handlers/build_token');
const path = require2('path');
const appdir = require2('tomjs/handlers/dir')();
const UserModel = require2(auth_cfg.auth_model);
const BaseApiError = require2('tomjs/error/base_api_error');
const Events = require2('tomjs/handlers/events');
const BaseController = require2('tomjs/controllers/base_controller');
const { decode } = require2('tomjs/handlers/jwt-sign');


//提供事件(users):
//retoken 事件 参数: ctx(上下文),token_info(原数据),token(生成的Token)

let jwt_payload = undefined;
try {
    jwt_payload = require(path.join(appdir, './auth/jwt_payload'));
} catch (error) { jwt_payload = undefined; }

let authInfo = {
    email_field: auth_cfg.email_field,
    mobile_field: auth_cfg.mobile_field,

    captcha_key_field: auth_cfg.captcha_key_field,

    mobile_need_captcha: auth_cfg.mobile_need_captcha,
    mobile_captcha_field: auth_cfg.mobile_captcha_field,

    login_username_fields: auth_cfg.login_username_fields,
    unique_user_name: auth_cfg.unique_user_name,

    not_exists_field_head: auth_cfg.not_exists_field_head,
    register_captcha: auth_cfg.register_captcha,
    register_captcha_field: auth_cfg.register_captcha_field,
    register_email: auth_cfg.register_email,
    register_email_field: auth_cfg.register_email_field,
    register_mobile: auth_cfg.register_mobile,
    register_mobile_field: auth_cfg.register_mobile_field,

    login_captcha: auth_cfg.login_captcha,
    login_captcha_field: auth_cfg.login_captcha_field,

    resetpassword_captcha: auth_cfg.resetpassword_captcha,
    resetpassword_captcha_field: auth_cfg.resetpassword_captcha_field,
    resetpassword_email: auth_cfg.resetpassword_email,
    resetpassword_email_field: auth_cfg.resetpassword_email_field,
    resetpassword_mobile: auth_cfg.resetpassword_mobile,
    resetpassword_mobile_field: auth_cfg.resetpassword_mobile_field,

    forgotpassword_captcha: auth_cfg.forgotpassword_captcha,
    forgotpassword_captcha_field: auth_cfg.forgotpassword_captcha_field,
    forgotpassword_email: auth_cfg.forgotpassword_email,
    forgotpassword_email_field: auth_cfg.forgotpassword_email_field,
    forgotpassword_mobile: auth_cfg.forgotpassword_mobile,
    forgotpassword_mobile_field: auth_cfg.forgotpassword_mobile_field,
};

class BaseUser extends BaseController {
    constructor(EventName) {
        super(EventName);
        this.users = UserModel.Model();
        this.emitter = Events.getEventEmitter('user');
    }

    async BuildToken(ctx, user, long) {
        if (!isObject(ctx.state)) { ctx.state = {}; }
        let user_token_obj = {};
        user_token_obj[auth_cfg.jwt_key_id] = user._id;
        user_token_obj[auth_cfg.jwt_key_token_version] = user[auth_cfg.jwt_key_token_version];

        let user_obj = undefined
        if (typeof (jwt_payload) == "function") {
            user_obj = await jwt_payload(ctx, user, long);
        }
        if (isObject(user_obj)) {
            Object.assign(user_token_obj, user_obj);
        }
        if (isString(user.language) && (user.language.length > 0)) { ctx.session[session_cfg.language_key] = user.language; }
        return build_token(ctx, user_token_obj, long);
    }

    async ReToken(ctx, long) {
        if (!isObject(ctx.state)) {
            throw new BaseApiError(BaseApiError.JWT_ERROR, 'state error');
        }
        if (!isObject(ctx.state[auth_cfg.jwt_key])) {
            throw new BaseApiError(BaseApiError.JWT_ERROR, 'state.' + auth_cfg.jwt_key + ' error');
        }

        let user = await ctx.auth.user();
        if (parseInt(user[auth_cfg.jwt_key_token_version], 10) != parseInt(ctx.state[auth_cfg.jwt_key][auth_cfg.jwt_key_token_version], 10)) {
            throw new BaseApiError(BaseApiError.JWT_ERROR, 'old token version Invalid', { now: parseInt(user[auth_cfg.jwt_key_token_version], 10), old: parseInt(ctx.state[auth_cfg.jwt_key][auth_cfg.jwt_key_token_version], 10) });
        }

        const dels = ['iat', 'exp', 'iss', 'nbf', 'aud', 'sub']; //需要排除的属性
        let user_token_obj = Object.assign({}, ctx.state[auth_cfg.jwt_key]);
        let len = dels.length;
        for (let i = 0; i < len; i++) {
            if (user_token_obj[dels[i]]) { delete user_token_obj[dels[i]]; }
        }
        let token = build_token(ctx, user_token_obj, long);
        this.emitter.emit('retoken', { ctx, token_obj: user_token_obj, token });
        return token;
    }

    async retoken(ctx, long) {
        let token = await this.ReToken(ctx, long);
        ctx.body = {
            userid: ctx.auth.id(),
            token: token,
        };
    }

    getLang(ctx) {
        ctx.body = { lang: ctx.lang, };
    }

    async setLang(ctx, lang) {
        lang = lang.trim();
        if (system_cfg.languages.trim()
            .split(',')
            .indexOf(lang) >= 0) {
            if (isObject(ctx.state[auth_cfg.jwt_key])) { //用户已经登陆此时有生效的session
                if (lang != ctx.session[session_cfg.language_key]) { //如果发现cookie语言类型和session不一致就修改session和用户数据记录
                    ctx.session[session_cfg.language_key] = lang;
                    if (this.users.schema.obj.language) {
                        await this.users.updateOne({ _id: ctx.auth.id() }, { language: lang });
                    }
                }
            }
            ctx.cookies.set(system_cfg.lang_cookie_key, lang, { path: '/', maxAge: 31622400000 }); //一年有效
        } else {
            throw new BaseApiError(BaseApiError.LANGUAGE_ERROR);
        }
    }

    getAuthInfo(ctx) {
        ctx.body = authInfo;
    }

    decodeToken(token) {
        return decode(token);
    }

};
module.exports = BaseUser;
const require2 = require('tomjs/handlers/require2');
const randomize = require2('randomatic');
const cfg = require2('tomjs/configs')();
const { isObject } = require2('tomjs/handlers/tools');
const BaseApiError = require2('tomjs/error/base_api_error');
const UserModel = require2(cfg.auth.auth_model);
const Cache = require2('tomjs/cache');
let captcha_cache = Cache(cfg.captcha.cache_name, cfg.captcha.cache_options);
const Events = require2('tomjs/handlers/events');

//提供事件(captcha_email):
//sent 事件 参数: captcha_name 验证字段名 receivers 接受者EMail地址, res 回复信息
//error 事件 参数: captcha_name 验证字段名 receivers 接受者EMail地址, error 错误信息

module.exports = async function(captcha_name, email_field_name, receivers, view_name, locals) {
    let len = cfg.auth.not_exists_field_head.length;
    let defname = 'capmail';
    let is_exists = true; //EMail地址必须存在
    if (typeof(captcha_name) !== "string") {
        captcha_name = defname;
    } else if (captcha_name.length <= 0) {
        captcha_name = defname;
    } else {
        if (captcha_name.substr(0, len) === cfg.auth.not_exists_field_head) {
            is_exists = false;
        }
    }

    let one_mail = receivers;
    if (isObject(receivers)) {
        one_mail = receivers.to.split(',')[0];
    }

    let users = UserModel.Model();
    let where_obj = {};
    where_obj[email_field_name] = one_mail;
    let count = await users.where(where_obj)
        .countDocuments();
    if (is_exists) {
        if (count <= 0) {
            throw new BaseApiError(BaseApiError.CAPTCHA_EMAIL_NOT_EXISTS_ERROR);
        }
    } else {
        if (count > 0) {
            throw new BaseApiError(BaseApiError.CAPTCHA_EMAIL_EXISTS_ERROR);
        }
    }

    if (!view_name) {
        if (cfg.captcha.email_views[captcha_name]) {
            view_name = cfg.captcha.email_views[captcha_name];
        } else {
            view_name = cfg.captcha.email_default_view;
        }
    }
    let data = {
        key: one_mail,
        text: randomize(cfg.captcha.email_code_type, cfg.captcha.email_code_size),
    };
    if (isObject(locals)) {
        locals[cfg.captcha.email_view_code] = data.text;
    } else {
        locals = {};
        locals[cfg.captcha.email_view_code] = data.text;
    }
    await captcha_cache.set(captcha_name + ":" + data.key, data.text.toLowerCase());

    emitter = Events.getEventEmitter('send_email');
    emitter.emit('send', {receivers, view_name, locals});

    if (cfg.system.NODE_ENV.trim()
        .toLowerCase() != 'development') { delete data.text; }
    return data;
};

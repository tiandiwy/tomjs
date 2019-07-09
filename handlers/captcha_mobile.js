const require2 = require('tomjs/handlers/require2');
const randomize = require2('randomatic');
const cfg = require2('tomjs/configs')();
const BaseApiError = require2('tomjs/error/base_api_error');
const UserModel = require(cfg.auth.auth_model);
const Events = require2('tomjs/handlers/events');
const Cache = require2('tomjs/cache');
let captcha_cache = Cache(cfg.captcha.cache_name, cfg.captcha.cache_options);


//提供事件(captcha_mobile):
//sent 事件 参数: captcha_name 验证字段名 phoneNumber 手机号码, res 回复信息
//error 事件 参数: captcha_name 验证字段名 phoneNumber 手机号码, error 错误信息

module.exports = async function(captcha_name, mobile_field_name, phoneNumber) {
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

    let users = UserModel.Model();
    let where_obj = {};
    where_obj[mobile_field_name] = phoneNumber;
    let count = await users.where(where_obj)
        .countDocuments();
    if (is_exists) {
        if (count <= 0) {
            throw new BaseApiError(BaseApiError.CAPTCHA_MOBILE_NOT_EXISTS_ERROR);
        }
    } else {
        if (count > 0) {
            throw new BaseApiError(BaseApiError.CAPTCHA_MOBILE_EXISTS_ERROR);
        }
    }

    let data = {
        key: phoneNumber,
        text: randomize(cfg.captcha.mobile_code_type, cfg.captcha.mobile_code_size),
    };
    await captcha_cache.set(captcha_name + ":" + data.key, data.text.toLowerCase());

    let params = {};
    params[cfg.captcha.mobile_param_code] = data.key;
    let templateId = undefined;
    if (cfg.captcha.mobile_template_ids[captcha_name]) {
        templateId = cfg.captcha.mobile_template_ids[captcha_name];
    } else {
        templateId = cfg.captcha.mobile_default_template_id;
    }

    emitter = Events.getEventEmitter('send_sms');
    emitter.emit('send', { phoneNumber, templateId, params, mobile_gateways:cfg.captcha.mobile_gateways });

    if (cfg.system.NODE_ENV.trim().toLowerCase() != 'development') { delete data.text; }
    return data;
};
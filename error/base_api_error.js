const require2 = require('tomjs/handlers/require2');
const path = require2('path');
const AppDir = require2('tomjs/handlers/dir');
const system_cfg = require2('tomjs/configs')().system;

function isObject(obj){//因为需要tools文件会用到本类所以不能调用tools文件下的isObject函数
    return (obj instanceof Object) && (!Array.isArray(obj));
}
//使用 class语法 将无法正常通过instanceof关键字判断类的类型
/**
 * 自定义Api异常
 */
function BaseApiError(error_code, error_msg, data) {

    BaseApiError.prototype.Translate = function(lang) {
        let loadOK = false;
        let _lang = undefined;
        if(lang === undefined){lang = system_cfg.Lang.trim();}
        try {
            _lang = require(path.join(AppDir(), './language/error/') + lang);
            loadOK = true;
        } catch (e) { loadOK = false; }
        if (loadOK) {
            try {
                if (_lang[this.message]) { return _lang[this.message]; } else { return this.message; }
            } catch (e) { return this.message; }
        } else { return this.message; }
    }

    BaseApiError.prototype.getMessage = function(code) {
        let message = '';
        switch (code) {
            case BaseApiError.OK:
                message = 'OK';
                break;
            case BaseApiError.VALIDATOR_ERROR:
                message = 'VALIDATOR_ERROR';
                break;
            case BaseApiError.AUTHORIZE_ERROR:
                message = 'AUTHORIZE_ERROR';
                break;                
            case BaseApiError.LANGUAGE_ERROR:
                message = 'LANGUAGE_ERROR';
                break;
            case BaseApiError.NOT_FOUND_ERROR:
                message = 'NOT_FOUND_ERROR';
                break;
            case BaseApiError.DEEP_POPULATE_MODEL_FILE_NOT_FOUND_ERROR:
                message = 'DEEP_POPULATE_MODEL_FILE_NOT_FOUND_ERROR';
                break;
            case BaseApiError.TOO_MANY_REQUESTS_ERROR:
                message = 'TOO_MANY_REQUESTS_ERROR';
                break;
            case BaseApiError.SYSTEM_ERROR:
                message = 'SYSTEM_ERROR';
                break;
            case BaseApiError.LOGIN_ERROR:
                message = 'LOGIN_ERROR';
                break;
            case BaseApiError.RESETPASSWORD_ERROR:
                message = 'RESETPASSWORD_ERROR';
                break;
            case BaseApiError.FORGOTPASSWORD_ERROR:
                message = 'FORGOTPASSWORD_ERROR';
                break;
            case BaseApiError.DB_ERROR:
                message = 'DB_ERROR';
                break;
            case BaseApiError.DB_NOT_FOUND_ERROR:
                message = 'DB_NOT_FOUND_ERROR';
                break;
            case BaseApiError.DB_DUPLICATE_KEY_ERROR:
                message = 'DB_DUPLICATE_KEY_ERROR';
                break;
            case BaseApiError.CAPTCHA_EMAIL_EXISTS_ERROR:
                message = 'CAPTCHA_EMAIL_EXISTS_ERROR';
                break;
            case BaseApiError.CAPTCHA_EMAIL_NOT_EXISTS_ERROR:
                message = 'CAPTCHA_EMAIL_NOT_EXISTS_ERROR';
                break;
            case BaseApiError.CAPTCHA_MOBILE_EXISTS_ERROR:
                message = 'CAPTCHA_MOBILE_EXISTS_ERROR';
                break;
            case BaseApiError.CAPTCHA_MOBILE_NOT_EXISTS_ERROR:
                message = 'CAPTCHA_MOBILE_NOT_EXISTS_ERROR';
                break;
            case BaseApiError.JWT_ERROR:
                message = 'JWT_ERROR';
                break;
            case BaseApiError.JSON_PARSE_ERROR:
                message = 'JSON_PARSE_ERROR';
                break;
            case BaseApiError.PQL_FILE_ERROR:
                message = 'PQL_FILE_ERROR';
                break;
            case BaseApiError.ONLY_PQL_FILE_ERROR:
                message = 'ONLY_PQL_FILE_ERROR';
                break;
            case BaseApiError.UNKNOW:
            default:
                message = 'UNKNOW';
                break;
        }
        return message;
    }

    this.code = error_code;
    this.data = data;
    this.name = "BaseApiError";
    //this.stack = (new Error()).stack;
    if (typeof(error_msg) == "string") {
        this.needTranslate = false;
        this.message = error_msg;
    } else {
        this.needTranslate = true;
        this.message = this.getMessage(error_code);
        if (isObject(error_msg) && (data === undefined)) { this.data = error_msg; }
    }
}
BaseApiError.prototype = Object.create(Error.prototype);
BaseApiError.prototype.constructor = BaseApiError;

//静态方法
BaseApiError.Translate = function(lang, message) {
    let loadOK = false;
    let _lang = undefined;
    if(lang === undefined){lang = system_cfg.Lang.trim();}
    try {
        _lang = require(path.join(AppDir(), './language/error/') + lang);
        loadOK = true;
    } catch (e) { loadOK = false; }
    if (loadOK) {
        try {
            if (_lang[message]) { return _lang[message]; } else { return message; }
        } catch (e) { return message; }
    } else { return message; }
}

BaseApiError.UNKNOW = -1;
BaseApiError.OK = 0;
BaseApiError.AUTHORIZE_ERROR = 100;
BaseApiError.VALIDATOR_ERROR = 101;
BaseApiError.LANGUAGE_ERROR = 201;
BaseApiError.NOT_FOUND_ERROR = 404;
BaseApiError.DEEP_POPULATE_MODEL_FILE_NOT_FOUND_ERROR = 410;
BaseApiError.TOO_MANY_REQUESTS_ERROR = 429;
BaseApiError.SYSTEM_ERROR = 500;
BaseApiError.LOGIN_ERROR = 601;
BaseApiError.RESETPASSWORD_ERROR = 611;
BaseApiError.FORGOTPASSWORD_ERROR = 621;
BaseApiError.DB_ERROR = 701;
BaseApiError.DB_NOT_FOUND_ERROR = 702;
BaseApiError.DB_DUPLICATE_KEY_ERROR = 703;
BaseApiError.CAPTCHA_EMAIL_EXISTS_ERROR = 801; //发送EMail验证码发现EMail已经存在
BaseApiError.CAPTCHA_EMAIL_NOT_EXISTS_ERROR = 802; //发送EMail验证码发现EMail不存在
BaseApiError.CAPTCHA_MOBILE_EXISTS_ERROR = 803; //发送手机验证码发现手机号码已经存在
BaseApiError.CAPTCHA_MOBILE_NOT_EXISTS_ERROR = 804; //发送手机验证码发现手机号码不存在
BaseApiError.JWT_ERROR = 901;//jwt相关错误
BaseApiError.JSON_PARSE_ERROR = 1001;//解析JSON错误
BaseApiError.PQL_FILE_ERROR = 1010;//载入PQL文件错误或解析成json时发生错误
BaseApiError.ONLY_PQL_FILE_ERROR = 1011;//PQL查询只允许使用PQL文件方式

module.exports = BaseApiError;
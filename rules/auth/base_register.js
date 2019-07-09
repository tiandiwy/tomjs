const require2 = require('tomjs/handlers/require2');
const auth_config = require2('tomjs/configs')().auth;

class BaseRegisterRules {

    async register(ctx) {
        //保存新建数据
        let rules = {
            name: 'required|regex:/^[A-Za-z\_][A-Za-z0-9\-\_]+$/|between:3,100|unique:users,name',
            password: 'required|min:6|max:70|confirmed',
        };

        if (auth_config.register_captcha) {
            rules[auth_config.captcha_key_field] = 'required|string';
            rules[auth_config.register_captcha_field] = 'required|captcha:' + ctx.request.body[auth_config.captcha_key_field];
        }
        if (auth_config.register_email) {
            rules[auth_config.email_field] = 'required|email|unique:users,' + auth_config.email_field;
            rules[auth_config.register_email_field] = 'required|captcha:' + ctx.request.body[auth_config.email_field];
        }
        if (auth_config.register_mobile) {
            rules[auth_config.mobile_field] = 'required|regex:/^1\\d{10}?$/|unique:users,' + auth_config.mobile_field;
            rules[auth_config.register_mobile_field] = 'required|captcha:' + ctx.request.body[auth_config.mobile_field];
        }

        return {
            rules: rules,
            messages: {
                regex: ':attribute 必须由字母或下划线开始并由字母或下划线以及数字组成',
                unique: ':attribute 不能重复',
                min: ':attribute 最小也要6个字符'
            }
        }
    }    
}
module.exports = BaseRegisterRules;

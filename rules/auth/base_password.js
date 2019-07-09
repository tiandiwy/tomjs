const require2 = require('tomjs/handlers/require2');
const auth_config = require2('tomjs/configs')().auth;

class BaseRegisterRules {

    async resetpassword(ctx) {
        //保存新建数据
        let rules = {
            old_password: 'required|min:6|max:70',
            password: 'required|min:6|max:70|confirmed',
            password_confirmation: 'required|min:6|max:70',
        };

        if (auth_config.resetpassword_captcha) {
            rules[auth_config.captcha_key_field] = 'required|string';
            rules[auth_config.resetpassword_captcha_field] = 'required|captcha:' + ctx.request.body[auth_config.captcha_key_field];
        }
        if (auth_config.resetpassword_email) {
            //表名，字段名，排除值（默认id字段），排除值的字段，条件字段，条件值
            rules[auth_config.email_field] = 'required|email|exists:users,' + auth_config.email_field + ',null,_id,_id,' + ctx.auth.id();
            rules[auth_config.resetpassword_email_field] = 'required|captcha:' + ctx.request.body[auth_config.email_field];
        }
        if (auth_config.resetpassword_mobile) {
            //表名，字段名，排除值（默认id字段），排除值的字段，条件字段，条件值
            rules[auth_config.mobile_field] = 'required|regex:/^1\\d{10}?$/|exists:users,' + auth_config.mobile_field + ',null,_id,_id,' + ctx.auth.id();
            rules[auth_config.resetpassword_mobile_field] = 'required|captcha:' + ctx.request.body[auth_config.mobile_field];
        }

        return {
            rules: rules,
            attributes: {
                old_password: ctx.__('Old Password'),
                password: ctx.__('New Password'),
                password_confirmation: ctx.__('New Password Confirmation'),
            }
        }
    }

    async forgotpassword(ctx) {
        //保存新建数据
        let rules = {
            password: 'required|min:6|max:70|confirmed',
            password_confirmation: 'required|min:6|max:70',
        };

        if (auth_config.forgotpassword_captcha) {
            rules[auth_config.captcha_key_field] = 'required|string';
            rules[auth_config.forgotpassword_captcha_field] = 'required|captcha:' + ctx.request.body[auth_config.captcha_key_field];
        }
        if (auth_config.forgotpassword_email) {
            rules[auth_config.email_field] = 'required|email|exists:users,' + auth_config.email_field;
            if (auth_config.forgotpassword_mobile) {
                rules[auth_config.email_field] += ',null,_id,' + auth_config.mobile_field + ',' + ctx.request.body[auth_config.mobile_field];
            }
            rules[auth_config.forgotpassword_email_field] = 'required|captcha:' + ctx.request.body[auth_config.email_field];
        }
        if (auth_config.forgotpassword_mobile) {
            rules[auth_config.mobile_field] = 'required|regex:/^1\\d{10}?$/|exists:users,' + auth_config.mobile_field;
            if (auth_config.forgotpassword_email) {
                rules[auth_config.mobile_field] += ',null,_id,' + auth_config.email_field + ',' + ctx.request.body[auth_config.email_field];
            }
            rules[auth_config.forgotpassword_mobile_field] = 'required|captcha:' + ctx.request.body[auth_config.mobile_field];
        }

        return {
            rules: rules,
            attributes: {
                password: ctx.__('New Password'),
                password_confirmation: ctx.__('New Password Confirmation'),
            }
        }
    }
}
module.exports = BaseRegisterRules;

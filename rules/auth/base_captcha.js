const require2 = require('tomjs/handlers/require2');
const auth_config = require2('tomjs/configs')().auth;

class BaseCaptchaRuls {

    async mobile(ctx) {
        //保存新建数据
        let rules = {};
        if (auth_config.mobile_need_captcha) {
            rules[auth_config.captcha_key_field] = 'required|string';
            rules[auth_config.mobile_captcha_field] = 'required|captcha:' + ctx.request.body[auth_config.captcha_key_field];
        }
        
        return {
            rules: rules,
        }
    }

}
module.exports = BaseCaptchaRuls;
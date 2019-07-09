const require2 = require('tomjs/handlers/require2');
const auth_config = require2('tomjs/configs')().auth;

class BaseLoginRules {

    async login(ctx) {
        //保存新建数据
        //auth_config
        let login_rules = {
            name: 'required|string',
            password: 'required|min:6|max:70',
        };
        if (auth_config.login_captcha) {
            login_rules[auth_config.captcha_key_field] = 'required|string';
            login_rules[auth_config.login_captcha_field] = 'required|captcha:' + ctx.request.body[auth_config.captcha_key_field];
        }
        return {
            rules: login_rules,
            messages: {
                regex: ':attribute 必须由字母或下划线开始并由字母或下划线以及数字组成',
                unique: ':attribute 不能重复',
                min: ':attribute 最小也要6个字符'
            }
        }
    }
}
module.exports = BaseLoginRules;

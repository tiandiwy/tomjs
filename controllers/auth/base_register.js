const require2 = require('tomjs/handlers/require2');
const BaseApiError = require2('tomjs/error/base_api_error');
const BaseUser = require2('tomjs/controllers/base_user');
const Password = require2('tomjs/password');
const auth_cfg = require2('tomjs/configs')().auth;
//提供事件:
//register 事件 参数: ctx(上下文),user(用户信息),token(生成Toekn)

class BaseRegister extends BaseUser {

    async register(ctx) {
        //保存新建数据
        let user = undefined;
        let expiresin_long = false;
        try {
            if (ctx.request.body[auth_cfg.expiresin_long] == 1) {
                delete ctx.request.body[auth_cfg.expiresin_long];
                expiresin_long = true;
            }
            ctx.request.body.password = await Password.hash(ctx.request.body.password);
            if (ctx.request.body.password_confirmation) { delete ctx.request.body.password_confirmation; };
            if (ctx.request.body.language === undefined) {
                ctx.request.body.language = ctx.lang;
            }
            user = await this.users.create(ctx.request.body);
        } catch (e) {
            throw new BaseApiError(BaseApiError.DB_ERROR, { message: e.message });
        }
        let token = await this.BuildToken(ctx, user, expiresin_long);
        this.emitter.emit('register', {ctx, user, token});
        ctx.body = {
            userid: user.id,
            token: token,
        };
    }
}
module.exports = BaseRegister;
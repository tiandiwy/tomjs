const require2 = require('tomjs/handlers/require2');
const BaseApiError = require2('tomjs/error/base_api_error');
const ForgotpasswordError = require2('tomjs/error/forgotpassword_error');
const BaseLogin = require2('tomjs/controllers/auth/base_login');
const Password = require2('tomjs/password');
const auth_cfg = require2('tomjs/configs')().auth;
//提供事件:
//resetpassword_error 事件 参数: ctx(上下文) userid
//resetpassword 事件 参数: ctx(上下文) userid
//forgotpassword_error 事件 参数: ctx(上下文) where
//forgotpassword 事件 参数: ctx(上下文) userid

class BaseRegister extends BaseLogin {

    async resetpassword(ctx) {
        let old_password = ctx.request.body.old_password;
        let user = await ctx.auth.user();
        if (user === null || user === undefined || (!await Password.compare(old_password, user[this.field_password()]))) {
            this.emitter.emit('resetpassword_error', {ctx, id:ctx.auth.id()});
            throw new BaseApiError(BaseApiError.RESETPASSWORD_ERROR);
        }

        let inc = {};
        inc[auth_cfg.jwt_key_token_version] = 1;
        let update = { $inc: inc };
        update[this.field_password()] = await Password.hash(ctx.request.body.password);
        try {
            await this.users.updateOne({ _id: user.id }, update);
            user = await this.users.findById(user.id);
        } catch (e) {
            throw new BaseApiError(BaseApiError.DB_ERROR, { message: e.message });
        }
        await this.BuildToken(ctx, user, ctx.state[auth_cfg.jwt_key][auth_cfg.jwt_key_exp_is_long]);
        this.emitter.emit('resetpassword', {ctx, id:user.id});

        ctx.body = {
            userid: user.id,
            token: ctx.state[auth_cfg.jwt_tokenkey],
        }
        return true;
    }

    async forgotpassword(ctx) {
        let have_base_field = false;
        let where = {}
        if (auth_cfg.forgotpassword_email) {
            have_base_field = true;
            where[auth_cfg.email_field] = ctx.request.body[auth_cfg.email_field];
        }
        if (auth_cfg.forgotpassword_mobile) {
            have_base_field = true;
            where[auth_cfg.mobile_field] = ctx.request.body[auth_cfg.mobile_field];
        }

        if (!have_base_field) {
            throw new ForgotpasswordError('Forgotpassword Need EMail or Mobile captcha!');
        }

        let user = undefined;
        try { user = await this.users.findOne(where); } catch (e) {
            throw new BaseApiError(BaseApiError.DB_ERROR, { message: e.message });
        }

        if (user === null || user === undefined) {
            this.emitter.emit('forgotpassword_error', {ctx, where});
            throw new BaseApiError(BaseApiError.FORGOTPASSWORD_ERROR);
        }

        let inc = {};
        inc[auth_cfg.jwt_key_token_version] = 1;
        let update = { $inc: inc };
        update[this.field_password()] = await Password.hash(ctx.request.body.password);
        try { await this.users.updateOne({ _id: user.id }, update); } catch (e) {
            throw new BaseApiError(BaseApiError.DB_ERROR, { message: e.message });
        }
        await this.BuildToken(ctx, user, false);
        this.emitter.emit('forgotpassword', {ctx, id:user.id});

        ctx.body = {
            userid: user.id,
            token: ctx.state[auth_cfg.jwt_tokenkey],
        }
        return true;
    }
}
module.exports = BaseRegister;

const require2 = require('tomjs/handlers/require2');
const BaseApiError = require2('tomjs/error/base_api_error');
const BaseUser = require2('tomjs/controllers/base_user');
const { isObject } = require2('tomjs/handlers/tools');
const Password = require2('tomjs/password');
const auth_cfg = require2('tomjs/configs')().auth;
//const log4js = require2('tomjs/handlers/log4js');
// let authLog = console;
// if (typeof(auth_cfg.log4js_category) && (auth_cfg.log4js_category.length > 0)) {
//     authLog = log4js.getLogger(auth_cfg.log4js_category);
// }

//提供事件:
//login_ok 事件 参数: ctx(上下文),user(用户信息),token(生成Toekn)
//login_error 事件 参数: ctx(上下文),in_where(生成Toekn)
//login_by_id 事件 参数: ctx(上下文),user(用户信息),token(生成Toekn)
//login_by_id_error 事件 参数: ctx(上下文),user id
//logout 事件 参数: ctx(上下文),user id
class BaseLogin extends BaseUser {

    field_name() {
        return 'name';
    }

    field_password() {
        return 'password';
    }

    post_password() {
        return 'password';
    }

    async login(ctx, name_fields) {
        if (auth_cfg.login_captcha) {
            if (ctx.request.body[auth_cfg.captcha_key_field]) { delete ctx.request.body[auth_cfg.captcha_key_field]; }
            if (ctx.request.body[auth_cfg.login_captcha_field]) { delete ctx.request.body[auth_cfg.login_captcha_field]; }
        }
        if (!name_fields) {
            name_fields = auth_cfg.login_username_fields;
        }
        let fields = name_fields.split(",");
        let fCount = fields.length;
        let field_name = this.field_name();
        if (fCount > 1 && ctx.request.body[field_name]) {
            let val = ctx.request.body[field_name];
            if (auth_cfg.register_name_email_mobile_lower_case) {
                val = val.toLowerCase();
            }
            let whereOrArr = [];
            for (let i = 0; i < fCount; i++) {
                let obj = {};
                obj[fields[i]] = val;
                whereOrArr.push(obj);
            }
            delete ctx.request.body[field_name];
            ctx.request.body['$or'] = whereOrArr;
        }

        let user = await this.loginByWhere(ctx, ctx.request.body, true);
        if (user === false) {
            throw new BaseApiError(BaseApiError.LOGIN_ERROR, { message: ctx.state.__('name or password error') });
        }
        let tokenInfo = this.decodeToken(ctx.state[auth_cfg.jwt_tokenkey]);
        ctx.body = {
            id: user.id,
            name: user.name,
            userid: user.id,
            token: ctx.state[auth_cfg.jwt_tokenkey],
            exp: tokenInfo.exp,
            exp_is_long: tokenInfo.exp_is_long,
        }
        if (user[auth_cfg.jwt_key_status] !== undefined) {
            ctx.body[auth_cfg.jwt_key_status] = user[auth_cfg.jwt_key_status];
        }
        return user;
    }

    async loginByWhere(ctx, in_where, check_password = true) {
        if (!isObject(in_where)) { return false; }
        let expiresin_long = false;
        if (in_where[auth_cfg.expiresin_long] == 1) {
            expiresin_long = true;
        }
        if (in_where[auth_cfg.expiresin_long] !== undefined) {
            delete in_where[auth_cfg.expiresin_long];
        }
        let where = Object.assign({}, in_where);
        let passwd = '';
        if (check_password) {
            if (where[this.post_password()]) {
                passwd = where[this.post_password()];
                delete where[this.post_password()];
            }
        }
        let user = undefined;
        try { user = await this.users.findOne(where) } catch (e) {
            throw new BaseApiError(BaseApiError.DB_ERROR, { message: e.message });
        }

        if (user === null || user === undefined || (check_password && (!await Password.compare(passwd, user[this.field_password()])))) {
            this.emitter.emit('login_error', { ctx, where: in_where });
            return false;
        }
        let token = await this.BuildToken(ctx, user, expiresin_long);
        this.emitter.emit('login_ok', { ctx, user, token, expiresin_long });
        return user;
    }

    async loginByID(ctx, id, expiresin_long) {
        let user = undefined
        try { user = await this.users.findById(id) } catch (e) {
            throw new BaseApiError(BaseApiError.DB_ERROR, { message: e.message });
        }

        if (user) {
            let token = await this.BuildToken(ctx, user, expiresin_long);
            this.emitter.emit('login_by_id', { ctx, user, token });
            return user;
        } else {
            this.emitter.emit('login_by_id_error', { ctx, id });
            return false;
        }
    }

    async logout(ctx) {
        ctx.cookies.set(auth_cfg.jwt_cookie, '', { path: '/', maxAge: 0, }); //清除cookie
        let inc = {};
        inc[auth_cfg.jwt_key_token_version] = 1;
        if (ctx.state[auth_cfg.jwt_key] && ctx.state[auth_cfg.jwt_key][auth_cfg.jwt_key_id]) {
            try { await this.users.updateOne({ _id: ctx.state[auth_cfg.jwt_key][auth_cfg.jwt_key_id] }, { $inc: inc }); } catch (e) {
                throw new BaseApiError(BaseApiError.DB_ERROR, { message: e.message });
            }
            this.emitter.emit('logout', { ctx, id: ctx.state[auth_cfg.jwt_key][auth_cfg.jwt_key_id] });
            ctx.body = {};
        } else {
            throw new BaseApiError(BaseApiError.JWT_ERROR);
        }
    }

}
module.exports = BaseLogin;
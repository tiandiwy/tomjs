const require2 = require('tomjs/handlers/require2');
const { isObject } = require2('tomjs/handlers/base_tools');
const { getDBObjByID } = require2('tomjs/handlers/db_tools');
const configs = require2('tomjs/configs')();
const UserModel = require2(configs.auth.auth_model);

module.exports = async function (ctx, next) {
    ctx.auth = {};
    ctx.auth.ID = undefined;
    ctx.auth.USER = undefined;

    ctx.auth.id = () => {
        if (ctx.auth.ID) { return ctx.auth.ID; }
        else if (isObject(ctx.state) && isObject(ctx.state[configs.auth.jwt_key])) {
            ctx.auth.ID = ctx.state[configs.auth.jwt_key][configs.auth.jwt_key_id];
            return ctx.auth.ID;
        }
        return undefined;
    };
    ctx.auth.ID = ctx.auth.id();

    ctx.auth.user = async () => {
        let users = UserModel.Model();
        if (isObject(ctx.state) && isObject(ctx.state[configs.auth.jwt_key])) {
            let id = ctx.state[configs.auth.jwt_key][configs.auth.jwt_key_id];
            if (id) {
                ctx.auth.USER = await getDBObjByID(users, id);
                return ctx.auth.USER;
            }
        }
        ctx.auth.USER = undefined;
        return ctx.auth.USER;
    };
    await ctx.auth.user();
    return next();
};

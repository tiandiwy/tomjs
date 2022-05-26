const require2 = require('tomjs/handlers/require2');
const koa_jwt = require2('koa-jwt');
const opt = require2('tomjs/auth/router_jwt_opt');

module.exports = (auth_all_path = false) => {
    const new_opt = Object.assign({}, opt);
    new_opt.passthrough = auth_all_path;
    return koa_jwt(new_opt);
};
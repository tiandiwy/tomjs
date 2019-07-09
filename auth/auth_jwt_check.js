const require2 = require('tomjs/handlers/require2');
const unless = require2('koa-unless');
const path = require2('path');
const { isObject } = require2('tomjs/handlers/tools');
const configs = require2('tomjs/configs')();

function jwt2() {
    let middleware = async function(ctx, next) {
        if (isObject(ctx.state) && isObject(ctx.state[configs.auth.jwt_key])) {
            return next();
        }
        ctx.throw(401, 'Authentication Error');
        return;
    };
    middleware.unless = unless;
    return middleware;
};

module.exports = jwt2().unless(configs.auth_unless);

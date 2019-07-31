const require2 = require('tomjs/handlers/require2');
const { isObject } = require2('tomjs/handlers/tools');
const configs = require2('tomjs/configs')();

module.exports = async function (ctx, next) {
    if (isObject(ctx.state)) {
        if (ctx.state.jwtOriginalError) {
            ctx.ws_error_send(ctx.state.jwtOriginalError);
            ctx.websocket.terminate();
        }
        if (isObject(ctx.state[configs.auth.jwt_key])) {
            return next();
        }
    }
    ctx.ws_error_send(new error('Bad Authorization query format. Format is "[url]?Authorization=Bearer <token>"'));
    ctx.websocket.terminate();
    return;
};

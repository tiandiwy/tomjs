const require2 = require('tomjs/handlers/require2');
const { isObject } = require2('tomjs/handlers/tools');
const configs = require2('tomjs/configs')();
const BaseApiError = require2('tomjs/error/base_api_error');

module.exports = async function (ctx, next) {
    if (isObject(ctx.state)) {
        if (ctx.state.jwtOriginalError) {
            //ctx.ws_error_send(ctx.state.jwtOriginalError);
            ctx.ws_error_send(new BaseApiError(BaseApiError.UNAUTHORIZED, ctx.state.jwtOriginalError.message,ctx.query));
            ctx.websocket.terminate();
            return;
        }
        if (isObject(ctx.state[configs.auth.jwt_key])) {
            return next();
        }
    }
    ctx.ws_error_send(new BaseApiError(BaseApiError.UNAUTHORIZED, 'Bad Authorization query format. Format is "[url]?Authorization=Bearer <token>"',ctx.query));
    ctx.websocket.terminate();
    return;
};

const require2 = require('tomjs/handlers/require2');
const configs = require2('tomjs/configs')();
const ratelimit = require2('tomjs/middleware/ratelimit');//访问限制器
const { isFunction, isObject } = require2('tomjs/handlers/base_tools');

module.exports = async (ctx, next) => {
    ctx.websocket.on('message', async (message) => {
        try {
            if (isObject(configs.ratelimit.websocket_global)) {
                await ratelimit('websocket_global').websocket(ctx);
            }
            if (isFunction(ctx.websocket.on_message)) {
                await ctx.websocket.on_message(JSON.parse(message));
            }
        }
        catch (error) {
            let no_auto_error_send = undefined;
            if (isFunction(ctx.websocket.on_error)) {
                no_auto_error_send = await ctx.websocket.on_error(error);
            }
            if ((no_auto_error_send !== false) && configs.system.websocket_auto_error_send) {
                ctx.ws_error_send(error);
            }
            else { ctx.websocket.emit('error', error); }
        }
    });
    return next();
}
const require2 = require('tomjs/handlers/require2');
const configs = require2('tomjs/configs')();
const BaseApiError = require2('tomjs/error/base_api_error');
const ratelimit = require2('tomjs/middleware/ratelimit');//访问限制器
const { isFunction, isObject, isString } = require2('tomjs/handlers/base_tools');
const Events = require2('tomjs/handlers/events');

let emitter = Events.getEventEmitter('websocket');

module.exports = async (ctx, next) => {
    ctx.websocket.on('message', async (message) => {
        try {
            if (isObject(configs.ratelimit.websocket_global)) {
                await ratelimit('websocket_global').websocket(ctx);
            }
            if (isFunction(ctx.websocket.on_message)) {
                await ctx.websocket.on_message(JSON.parse(message));
            }
            else {
                let handle = setInterval(async () => {
                    if (isFunction(ctx.websocket.on_message)) {
                        clearInterval(handle);
                        await ctx.websocket.on_message(JSON.parse(message));
                    }
                }, 20);
            }
        }
        catch (error) {
            let data = JSON.parse(message);
            if (isString(data.method)) {
                data.method = data.method.trim().toUpperCase();
            }
            let no_auto_error_send = undefined;
            if (isFunction(ctx.websocket.on_error)) {
                no_auto_error_send = await ctx.websocket.on_error(error);
            }
            else { ctx.websocket.emit('error', error); }
            if (no_auto_error_send !== false) {
                if (configs.system.websocket_auto_error_send || error instanceof BaseApiError) {
                    ctx.websocket.error_send(error, data);
                }
                else {
                    emitter.emit('error', { error, ctx });
                }
            }
        }
    });
    ctx.websocket.on('close', (code, reason) => {
        ctx.websocket.servers.deleteSocket(ctx);
    });
    return next();
}
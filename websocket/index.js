const require2 = require('tomjs/handlers/require2');//可以开始使用require2引入模块了
const app_dir = require2('tomjs/handlers/dir')();
const path = require2('path');
const build_auth_jwt = require2('tomjs/auth/auth_jwt');
const auth_jwt = build_auth_jwt('websocket');
const auth_jwt_check = require2('tomjs/auth/auth_jwt_check');
const auth_user = require2('tomjs/middleware/auth_user');
const appdir = require2('tomjs/handlers/dir')();
const configs = require2('tomjs/configs')();
const ratelimit = require2('tomjs/middleware/ratelimit');//访问限制器
const { isFunction, isObject } = require2('tomjs/handlers/base_tools');
const websocket_response_formatter = require2('tomjs/middleware/websocket_response_formatter');
const ws_init = require(path.join(app_dir, './init/websocket'));//提供用户第一时间初始化ws使用
const initWebSocket = require(path.join(appdir, './websocket'));

async function initWS(ws, isWSS) {
    ws = await ws_init(ws, isWSS);
    ws.use(websocket_response_formatter);
    ws.use(async (ctx, next) => {
        ctx.throw = async function (code, message, data) {
            await ctx.ws_error_send({ code, message, data });
            ctx.websocket.terminate();
        }
        return next();
    });
    ws.use(auth_jwt);
    if (configs.auth.jwt_auth_all_path) {
        ws.use(auth_jwt_check('websocket'));
    }
    ws.use(auth_user);
    ws.use(async (ctx, next) => {
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
    });
    await initWebSocket(ws, isWSS);
}

module.exports = async function (app_ws, app_wss) {
    if (app_ws) {
        await initWS(app_ws.ws, false);
    }
    if (app_wss) {
        await initWS(app_wss.ws, true);
    }
}
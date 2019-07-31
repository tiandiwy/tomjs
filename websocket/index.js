const require2 = require('tomjs/handlers/require2');//可以开始使用require2引入模块了
const path = require2('path');
//const auth_ws_jwt = require2('tomjs/auth/auth_ws_jwt');
const build_auth_jwt = require2('tomjs/auth/auth_jwt');
const auth_jwt = build_auth_jwt(true);
const auth_jwt_ws_check = require2('tomjs/auth/auth_jwt_ws_check');
const auth_user = require2('tomjs/middleware/auth_user');
const appdir = require2('tomjs/handlers/dir')();
const ratelimit_cfg = require2('tomjs/configs')().ratelimit;
const system_cfg = require2('tomjs/configs')().system;
const ratelimit = require2('tomjs/middleware/ratelimit');//访问限制器
const { isFunction, isObject } = require2('tomjs/handlers/base_tools');
const initWebSocket = require(path.join(appdir, './websocket'));

async function initWS(ws, isWSS) {
    ws.use(auth_jwt);
    ws.use(auth_jwt_ws_check);
    ws.use(auth_user);
    ws.use(async (ctx, next) => {
        ctx.websocket.on('message', async (message) => {
            try {
                if (isObject(ratelimit_cfg.websocket_global)) {
                    await ratelimit('websocket_global').websocket(ctx);
                }
                if (isFunction(ctx.websocket.on_message)) {
                    await ctx.websocket.on_message(message);
                }
            }
            catch (error) {
                let no_auto_error_send = undefined;
                if (isFunction(ctx.websocket.on_error)) {
                    no_auto_error_send = await ctx.websocket.on_error(error);
                }
                if ((no_auto_error_send !== false) && system_cfg.websocket_auto_error_send) {
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
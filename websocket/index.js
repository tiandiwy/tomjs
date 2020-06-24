const require2 = require('tomjs/handlers/require2');//可以开始使用require2引入模块了
const app_dir = require2('tomjs/handlers/dir')();
const path = require2('path');
const Subdomain = require2('koa-subdomain');
const KoaIP = require2('koa-ip');
const auth_user = require2('tomjs/middleware/auth_user');
const setupLang = require2('tomjs/middleware/setuplang');
const session = require2("tomjs-koa-session2");
const Store = require2("tomjs/session/cahce_store");
const appdir = require2('tomjs/handlers/dir')();
const configs = require2('tomjs/configs')();
const websocket_response_formatter = require2('tomjs/middleware/websocket_response_formatter');
const websocket_lang = require2('tomjs/middleware/websocket_lang');
const websocket_onmessage = require2('tomjs/middleware/websocket_onmessage');
const websocket_getid = require2('tomjs/middleware/websocket_getid');
const websocket_wsservers = require2('tomjs/middleware/websocket_wsservers');
const ws_init = require(path.join(app_dir, './init/websocket'));//提供用户第一时间初始化ws使用
const ws_end_init = require(path.join(appdir, './websocket'));
const AllWsServer = require2('tomjs/handlers/all_ws_server');

async function initWS(server_ws, isWSS) {
    AllWsServer.setWS(server_ws.ws.server, isWSS);
    server_ws = await ws_init(server_ws, isWSS);
    let ws = server_ws.ws;
    ws.use(websocket_wsservers);
    ws.use(websocket_getid);
    ws.use(websocket_lang);
    ws.use(websocket_response_formatter);
    ws.use(async (ctx, next) => {
        ctx.throw = async function (code, message, data) {
            await ctx.websocket.error_send({ code, message, data });
            ctx.websocket.terminate();
        }
        return next();
    });

    ws.use(auth_user);
    ws.use(session({ key: configs.session.session_key, store: new Store() }));
    ws.use(setupLang);
    const subdomain_ip = new Subdomain();
    const subdomain = new Subdomain();
    for (let idx in configs.subdomain.maps) {
        if (configs.subdomain.maps[idx].websocket) {
            let route = require(path.join(app_dir, configs.subdomain.maps[idx].websocket));
            subdomain.use(idx, route.routes());
            if (isObject(configs.subdomain.maps[idx].ip)) {
                subdomain_ip.use(idx, KoaIP(configs.subdomain.maps[idx].ip));
            }
        }
    }
    ws.use(websocket_onmessage);
    ws.use(subdomain_ip.routes());
    ws.use(subdomain.routes());

    await ws_end_init(server_ws, isWSS);
}

module.exports = async function (server_ws, server_wss) {
    if (server_ws) {
        await initWS(server_ws, false);
    }
    if (server_wss) {
        await initWS(server_wss, true);
    }
}
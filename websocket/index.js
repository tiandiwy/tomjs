const require2 = require('tomjs/handlers/require2');//可以开始使用require2引入模块了
const path = require2('path');
//const auth_ws_jwt = require2('tomjs/auth/auth_ws_jwt');
const build_auth_jwt = require2('tomjs/auth/auth_jwt');
const auth_jwt = build_auth_jwt(true);
const auth_jwt_ws_check = require2('tomjs/auth/auth_jwt_ws_check');
const auth_user = require2('tomjs/middleware/auth_user');
const appdir = require2('tomjs/handlers/dir')();
const initWebSocket = require(path.join(appdir, './websocket'));

async function initWS(ws, isWSS) {
    ws.use(auth_jwt);
    ws.use(auth_jwt_ws_check);
    ws.use(auth_user);
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
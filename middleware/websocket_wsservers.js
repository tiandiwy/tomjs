const require2 = require('tomjs/handlers/require2');
const AllWsServers = require2('tomjs/handlers/all_ws_server').getAllWS();

module.exports = function (ctx, next) {
    ctx.websocket.servers = AllWsServers;
    //bind room相关函数
    //AllWsServers.ctxBindBroadcastFn(ctx);
    return next();
};

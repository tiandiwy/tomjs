const require2 = require('tomjs/handlers/require2');
const uuid = require2('uuid');
const AllWsServers = require2('tomjs/handlers/all_ws_server').getAllWS();

module.exports = async function (ctx, next) {
    let socketID = uuid.v4();
    ctx.websocket.getID = () => {
        return socketID;
    }
    AllWsServers.addSocket(ctx);
    return next();
};

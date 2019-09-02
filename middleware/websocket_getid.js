const require2 = require('tomjs/handlers/require2');
const uuidv4 = require2('uuid/v4');
const AllWsServers = require2('tomjs/handlers/all_ws_server').getAllWS();

module.exports = async function (ctx, next) {
    let socketID = uuidv4();
    ctx.websocket.getID = () => {
        return socketID;
    }
    AllWsServers.addSocket(ctx);
    return next();
};

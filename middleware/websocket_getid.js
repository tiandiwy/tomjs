const require2 = require('tomjs/handlers/require2');
const uuidv4 = require2('uuid/v4');

module.exports = async function (ctx, next) {
    ctx.websocket._tempid = 't-' + uuidv4();
    ctx.websocket.getID = () => {
        let id = ctx.auth.id();
        if (!id) { id = ctx.websocket._tempid; }
        return id;
    }
    return next();
};

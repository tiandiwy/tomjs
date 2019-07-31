const require2 = require('tomjs/handlers/require2');
const system_cfg = require2('tomjs/configs')().system;
module.exports = async function (ctx, next) {
    ctx.ws_send = function (data) {
        arguments[0] = JSON.stringify({
            code: 0,
            message: 'success',
            data: data
        });
        ctx.websocket.send.apply(ctx.websocket, arguments);
    };

    ctx.ws_error_send = function (error) {
        let err_obj = {
            code: -1,
            message: error.message,
            data: {},
        }
        if (error.name) {
            err_obj.data.name = error.name;
        }
        if (error.info) {
            err_obj.data.info = error.info;
        }
        if (system_cfg.NODE_ENV.trim().toLowerCase() == 'development' && error.stack) {
            err_obj.data.stack = error.stack;
        }
        arguments[0] = JSON.stringify(err_obj);
        ctx.websocket.send.apply(ctx.websocket, arguments);
    };

    return next();
};

const require2 = require('tomjs/handlers/require2');
const BaseApiError = require2('tomjs/error/base_api_error');
const system_cfg = require2('tomjs/configs')().system;
const Events = require2('tomjs/handlers/events');

let emitter = Events.getEventEmitter('websocket');

module.exports = async function (ctx, next) {
    ctx.websocket.old_send = ctx.websocket.send;
    ctx.websocket.send = async function (data) {
        arguments[0] = JSON.stringify({
            code: 0,
            message: 'success',
            data: data
        });
        return await ctx.websocket.old_send.apply(ctx.websocket, arguments);
    };

    ctx.websocket.error_send = async function (error) {
        let err_obj = {
            code: -1,
            message: error.message,
            data: {},
        }
        let isOK = false;//程序是否抛出 BaseApiError.OK 异常 这种异常是属于正常退出的异常，以无内容正常退出方式处理
        if (error instanceof BaseApiError) {
            if (error.code !== BaseApiError.OK) {
                err_obj.code = error.code;
                err_obj.message = error.needTranslate ? error.Translate(ctx.lang) : error.message;
                err_obj.data = error.data || {};
            }
            else {
                isOK = true;
            }
        } else if (error.status == 401 || error.code == 401) {
            err_obj.code = 401;
            err_obj.message = error.originalError ? error.originalError.message : error.message,
                err_obj.data = error.data || {};
        } else if (error.name == "MissingSchemaError") {
            err_obj.code = BaseApiError.DEEP_POPULATE_MODEL_FILE_NOT_FOUND_ERROR,
                err_obj.message = error.message,
                err_obj.data = error.data || {};
        } else if (error.name == "TooManyRequestsError") {
            err_obj.code = 429;
            err_obj.message = error.message,
                err_obj.data = error.data || {};
        } else if (system_cfg.all_error_web_show) {
            emitter.emit('error', { error, ctx });
            ctx.body = {
                code: BaseApiError.UNKNOW,
                message: error.message,
                data: error.stack,
            };
            NeedThrow = false;
        }
        else {
            if (error.code) {
                err_obj.data.code = error.code;
            }
            if (error.data) {
                err_obj.data.data = error.data;
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
        }
        if (isOK) {
            ctx.body = {
                code: 0,
                message: 'success',
                data: {}
            };
        }
        else {
            emitter.emit('error_send', { error, ctx });
        }

        arguments[0] = JSON.stringify(err_obj);
        return await ctx.websocket.old_send.apply(ctx.websocket, arguments);
    };

    return next();
};

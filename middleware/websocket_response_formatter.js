const require2 = require('tomjs/handlers/require2');
const BaseApiError = require2('tomjs/error/base_api_error');
const configs = require2('tomjs/configs')();
const system_cfg = configs.system;
const Events = require2('tomjs/handlers/events');
const { isObject, isFunction } = require2('tomjs/handlers/base_tools');

let emitter = Events.getEventEmitter('websocket');

module.exports = async function (ctx, next) {
    ctx.websocket.old_send = ctx.websocket.send;
    ctx.websocket.send = function (data) {
        if (data === undefined) { data = {}; }
        if (!isObject(data)) {
            data = { data: data };
        }
        let new_data = {
            code: 0,
            message: 'OK',
            data: data
        }

        let send_data = null;
        if (isFunction(configs.websocket.serialize_method)) {
            send_data = configs.websocket.serialize_method(Object.assign({}, new_data, data));
        }
        else {
            send_data = JSON.stringify(Object.assign({}, new_data, data));
        }
        arguments[0] = send_data;
        return ctx.websocket.old_send.apply(ctx.websocket, arguments);
    };

    ctx.websocket.error_send = function (error, data) {
        let err_obj = {
            code: error.code || -1,
            message: error.message,
            data: {},
        }
        if (isObject(data)) { err_obj = Object.assign({}, data, err_obj); }
        let isSend = false;
        let isOK = false;//程序是否抛出 BaseApiError.OK 异常 这种异常是属于正常退出的异常，以无内容正常退出方式处理
        if (error instanceof BaseApiError) {
            isSend = true;
            if (error.code !== BaseApiError.OK) {
                err_obj.code = error.code;
                err_obj.message = error.needTranslate ? error.Translate(ctx.lang) : error.message;
                err_obj.data = error.data || {};
            }
            else {
                isOK = true;
            }
        } else if (error.status == 401 || error.code == 401) {
            isSend = true;
            err_obj.code = 401;
            err_obj.message = error.originalError ? error.originalError.message : error.message;
            err_obj.data = error.data || {};
        } else if (error.name == "MissingSchemaError") {
            isSend = true;
            err_obj.code = BaseApiError.DEEP_POPULATE_MODEL_FILE_NOT_FOUND_ERROR;
            err_obj.message = error.message;
            err_obj.data = error.data || {};
        } else if (error.name == "TooManyRequestsError") {
            isSend = true;
            err_obj.code = 429;
            err_obj.message = error.message;
            err_obj.data = error.data || {};
        } else if (system_cfg.all_error_web_show) {
            isSend = true;
            err_obj.code = BaseApiError.UNKNOW;
            err_obj.message = error.message;
            err_obj.data = error.stack;
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
            err_obj.code = 0;
            err_obj.message = 'OK';
            err_obj.data = {};
        }
        else {
            emitter.emit('error', { error, ctx });
            if (isSend) {
                if (err_obj.id) {
                    if (err_obj.id.startsWith(system_cfg.websocket_id_head)) {
                        delete err_obj.id;
                    }
                }
            }
        }
        if (isSend) {
            emitter.emit('error_send', { error: err_obj, ctx });
            let send_data = null;
            if (isFunction(configs.websocket.serialize_method)) {
                send_data = configs.websocket.serialize_method(err_obj);
            }
            else {
                send_data = JSON.stringify(err_obj);
            }
            ctx.websocket.old_send(send_data);
        }
    };

    return next();
};

const require2 = require('tomjs/handlers/require2');
const BaseApiError = require2('tomjs/error/base_api_error');
const { isObject } = require2('tomjs/handlers/base_tools');
const subdomain_cfg = require2('tomjs/configs')().subdomain;
const SystemConfig = require2('tomjs/configs')().system;
const Events = require2('tomjs/handlers/events');

let emitter = Events.getEventEmitter('error');
/**
 * 在app.use(router)之前调用 自动格式化输出
 */
let response_formatter = (ctx) => {
    ctx.response.type = 'application/json';
    //如果有返回数据，将返回数据添加到data中
    if (ctx.status === 429) {

    }
    else if (ctx.body) {
        ctx.body = {
            code: 0,
            message: 'success',
            data: ctx.body
        };
    } else {
        ctx.body = {
            code: 0,
            message: 'success',
            data: {}
        };
    }
}

let url_filter = () => {
    let path_pattern = undefined;
    let hostname_pattern = undefined;
    if (isObject(subdomain_cfg.response_api_formatter)) {
        path_pattern = subdomain_cfg.response_api_formatter.path;
        hostname_pattern = subdomain_cfg.response_api_formatter.hostname;
    }
    return async (ctx, next) => {
        let isAPI = false;
        if (hostname_pattern) {
            let reg = new RegExp(hostname_pattern);
            isAPI = reg.test(ctx.hostname);
        }
        if (isAPI && path_pattern) {
            let reg = new RegExp(path_pattern);
            isAPI = reg.test(ctx.originalUrl);
        }
        try {
            //先去执行路由
            await next();
            //通过正则的url进行格式化处理
            if (isAPI) {
                response_formatter(ctx);
            }
        } catch (error) {
            if (isAPI) {
                let isOK = false;//程序是否抛出 BaseApiError.OK 异常 这种异常是属于正常退出的异常，以无内容正常退出方式处理
                //如果异常类型是API异常并且通过正则验证的url，将错误信息添加到响应体中返回。
                let NeedThrow = true;
                if ((error instanceof BaseApiError) /*&& reg.test(ctx.originalUrl)*/) {
                    if (error.code !== BaseApiError.OK) {
                        ctx.status = 200;
                        ctx.body = {
                            code: error.code,
                            message: error.needTranslate ? error.Translate(ctx.lang) : error.message,
                            data: error.data || {},
                        };
                    }
                    else {
                        isOK = true;
                    }
                    NeedThrow = false;
                } else if (error.status == 401) {
                    ctx.status = 200;
                    ctx.body = {
                        code: 401,
                        message: error.originalError ? error.originalError.message : error.message,
                        data: {},
                    };
                    NeedThrow = false;
                } else if (error.name == "MissingSchemaError") {
                    ctx.status = 200;
                    ctx.body = {
                        code: BaseApiError.DEEP_POPULATE_MODEL_FILE_NOT_FOUND_ERROR,
                        message: error.message,
                        data: {},
                    };
                    NeedThrow = false;
                } else if (error.name == "TooManyRequestsError") {
                    NeedThrow = true;
                } else if (SystemConfig.all_error_web_show) {
                    emitter.emit('error', { error, ctx });
                    ctx.status = 200;
                    ctx.body = {
                        code: BaseApiError.UNKNOW,
                        message: error.message,
                        data: error.stack,
                    };
                    NeedThrow = false;
                }
                if (isOK) {
                    ctx.body = {
                        code: 0,
                        message: 'success',
                        data: {}
                    };
                }
                else {
                    emitter.emit('all_error', { error, ctx });
                }
                //继续抛，让外层中间件处理日志
                if (NeedThrow) { throw error; } else { ctx.response.type = 'application/json'; }
            }
            else { throw error; }
        }
    }
}
module.exports = url_filter;

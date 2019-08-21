const require2 = require('tomjs/handlers/require2');
const path = require2('path');
const appdir = require2('tomjs/handlers/dir')();
const Validator = require(path.join(appdir, './validator/validator.js'));//通过调用用户定义的validator，方便用户添加自定义验证码规则
const BaseApiError = require2('tomjs/error/base_api_error');
const WSRouterRrror = require2('tomjs/error/ws_router_error');
const KoaRouter = require2('koa-router');
const { isObject, isArray, isString, isFunction } = require2('tomjs/handlers/tools');
const ratelimit = require2('tomjs/middleware/ratelimit');
const subdomain_cfg = require2('tomjs/configs')().subdomain;

class WebsocketRouter {
    constructor() {
        this.router = new KoaRouter();
    }

    cloneCTX(ctx, data) {
        let new_ctx = Object.assign({}, ctx);
        new_ctx.matched = undefined;
        new_ctx.res = {};
        new_ctx.status = 0;
        new_ctx.subdomains = ctx.subdomains;
        new_ctx.ip = ctx.ip;
        new_ctx.ips = ctx.ips;
        new_ctx._body = undefined;
        if (data.method) {
            new_ctx.method = data.method;
        }
        if (data.path) { new_ctx.path = data.path; }
        new_ctx.websocket.message = data;
        if (isObject(data) && data.data) {
            new_ctx.request = { body: data.data };
        }
        Object.defineProperty(new_ctx, "body", {
            configurable: false,
            enumerable: false,
            set: function (value) {
                this._body = value;
                if (new_ctx.status === 0) { new_ctx.status = 200; }
            },
            get: function () {
                return this._body;
            }
        });
        return new_ctx;
    }

    path(path_str, controller) {
        let old_controller = controller;
        let controller_fn = () => { };

        let ws_route_fn = async (ctx, next) => {
            ctx.websocket.on_message = async (data) => {
                data.method = data.method.trim().toUpperCase();
                let new_ctx = this.cloneCTX(ctx, data);

                //新 send 函数 默认添加method、path两个参数
                let old_send = new_ctx.websocket.send;
                new_ctx.websocket.send = function (sned_data) {
                    if (!isObject(sned_data)) {
                        sned_data = { data: sned_data };
                    }
                    arguments[0] = Object.assign({ id: data.id, method: data.method, path: data.path }, sned_data);
                    return old_send.apply(ctx.websocket, arguments);
                };

                //新 error_send 函数 默认添加method、path两个参数
                let old_error_send = new_ctx.websocket.error_send;
                new_ctx.websocket.error_send = function (error) {
                    error.data = Object.assign({ id: data.id, method: data.method, path: data.path }, error.data);
                    arguments[0] = error;
                    return old_error_send.apply(ctx.websocket, arguments);
                };

                let new_next = async () => {
                    if (new_ctx.status === 0) {
                        if ((new_ctx.matched === undefined)
                            || (isArray(new_ctx.matched) && new_ctx.matched.length <= 0)
                        ) {
                            new_ctx.status = 404;
                            throw new BaseApiError(BaseApiError.NOT_FOUND_ERROR, data);
                        }
                    }
                    else if (new_ctx.status == 200 && new_ctx.body !== undefined) {
                        await new_ctx.websocket.send(new_ctx.body);
                    }
                    return Promise.resolve();
                };
                await controller_fn(new_ctx, new_next);
            };
            return next();
        };

        if (isString(controller)) {
            controller = require(path.join(appdir, subdomain_cfg.socket_router_path, controller));
        }
        if (isObject(controller)) {
            if (isFunction(controller.routes)) {
                controller_fn = controller.routes();
                controller = ws_route_fn;
            }
            else {
                throw new WSRouterRrror(`ws_router param:${old_controller}, error: Not find routes function`);
            }
        }
        else if (!isFunction(controller)) {
            throw new WSRouterRrror(`ws_router param:${old_controller}, error: Not a function or Object`);
        }

        return this.router.all(path_str, controller);
    }

    routes() {
        return this.router.routes.apply(this.router, arguments);
    }

    use() {
        return this.router.use.apply(this.router, arguments);
    }

    prefix() {
        return this.router.prefix.apply(this.router, arguments);
    }
}
module.exports = WebsocketRouter;
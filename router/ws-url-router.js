const require2 = require('tomjs/handlers/require2');
const path = require2('path');
const WebSocket = require2('ws');
const appdir = require2('tomjs/handlers/dir')();
const BaseApiError = require2('tomjs/error/base_api_error');
const WSRouterRrror = require2('tomjs/error/ws_router_error');
const WSTimeOutRrror = require2('tomjs/error/ws_timeout_error');
const KoaRouter = require2('koa-router');
const { isObject, isArray, isString, isFunction } = require2('tomjs/handlers/tools');
const subdomain_cfg = require2('tomjs/configs')().subdomain;
const system_cfg = require2('tomjs/configs')().system;
const Events = require2('tomjs/handlers/events');
const render = require2('tomjs/handlers/render');
const AllWsServers = require2('tomjs/handlers/all_ws_server').getAllWS();

let emitter = Events.getEventEmitter('websocket');

class WS_URL_Router {
    constructor() {
        this.router = new KoaRouter();
    }

    cloneCTX(ctx, data) {
        let new_ctx = Object.assign({}, ctx);
        new_ctx.matched = undefined;
        new_ctx.res = {};
        new_ctx.response = {};
        new_ctx.status = 0;
        new_ctx.subdomains = ctx.subdomains;
        new_ctx.ip = ctx.ip;
        new_ctx.ips = ctx.ips;
        new_ctx._body = undefined;
        new_ctx.header = Object.assign({}, ctx.header, { data });
        new_ctx.headers = Object.assign({}, ctx.headers, { data });
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
        new_ctx.render = async function (view_name, locals = {}, lang, root_path) {
            new_ctx.body = await render(view_name, Object.assign({}, { ctx: new_ctx }, locals), lang, root_path);
        };
        new_ctx.websocket_server.broadcast_send = function (send_data) {
            if (AllWsServers.ws) {
                AllWsServers.ws.clients.forEach(function each(client) {
                    if (client.readyState === WebSocket.OPEN) {
                        client.send(send_data);
                    }
                });
            }
            if (AllWsServers.wss) {
                AllWsServers.wss.clients.forEach(function each(client) {
                    if (client.readyState === WebSocket.OPEN) {
                        client.send(send_data);
                    }
                });
            }
        };
        new_ctx.websocket.broadcast_send = async function (send_data) {
            let user = await ctx.auth.user();
            let ws_data = { method: data.method, path: data.path, data: send_data, sender_id: user.id, sender_name: user.name };
            if (AllWsServers.ws) {
                AllWsServers.ws.clients.forEach(function each(client) {
                    if (client !== new_ctx.websocket && client.readyState === WebSocket.OPEN) {
                        client.send(ws_data);
                    }
                });
            }
            if (AllWsServers.wss) {
                AllWsServers.wss.clients.forEach(function each(client) {
                    if (client !== new_ctx.websocket && client.readyState === WebSocket.OPEN) {
                        client.send(ws_data);
                    }
                });
            }
        };
        return new_ctx;
    }

    path(path_str, controller) {
        let old_controller = controller;
        let controller_fn = () => { };

        let ws_route_fn = async (ctx, next) => {
            let iSendID = 0;
            function getNewSendID() {
                iSendID++;
                return system_cfg.websocket_id_head + iSendID;
            }
            let AsyncObj = {};
            let old_send = ctx.websocket.old_send;

            ctx.websocket.on_message = async (data) => {
                if (isString(data.method)) {
                    data.method = data.method.trim().toUpperCase();
                }
                let new_ctx = this.cloneCTX(ctx, data);

                if (isObject(data) && data.id && data.id.startsWith(system_cfg.websocket_id_head)) {
                    if (AsyncObj[data.id]) {
                        var resolve_reject = AsyncObj[data.id];
                        delete AsyncObj[data.id];
                        if (resolve_reject.timeout_handle) { clearTimeout(resolve_reject.timeout_handle); }
                        if (data.code == 0) {
                            resolve_reject.resolve(data.data);
                        }
                        else {
                            resolve_reject.reject(data);
                        }
                    }
                    else {
                        //无需回复，但客户端依旧回复的内容
                        emitter.emit('receive_error_reply', { data, new_ctx });
                    }
                }
                else {
                    let send = (method, path, send_data, user_id, user_name, id) => {
                        if (path === undefined && send_data === undefined && id === undefined) {
                            send_data = method;
                            method = data.method;
                            path = data.path;
                        }
                        if (send_data === undefined) { send_data = {}; }
                        let data_obj = { code: 0, message: 'success', method, path, data: send_data };
                        if (id) { data_obj.id = id; }
                        if (user_id) { data_obj.sender_id = user_id; }
                        if (user_name) { data_obj.sender_name = user_name; }
                        arguments[0] = JSON.stringify(data_obj);
                        return old_send.apply(ctx.websocket, arguments);
                    };
                    new_ctx.websocket.send = function (method, path, send_data) {
                        return send(method, path, send_data);
                    };
                    new_ctx.websocket.sendAsync = function (method, path, send_data, timeout) {
                        return new Promise((resolve, reject) => {
                            let id = getNewSendID();
                            send(method, path, send_data, undefined, undefined, id);
                            let timeout_handle = undefined;
                            let time_out = timeout || parseInt(system_cfg.websocket_send_time_out);
                            if (time_out > 0) {
                                let timeout_fn = function () {
                                    if (AsyncObj[id]) { delete AsyncObj[id] }
                                    reject(new WSTimeOutRrror('websocket time out:' + time_out, { id, method, path, data: send_data }));
                                }
                                timeout_handle = setTimeout(timeout_fn, time_out);
                            }
                            AsyncObj[id] = { resolve: resolve, reject: reject, timeout_handle: timeout_handle };
                        });
                    };

                    let isRunNewNext = false;
                    new_ctx.websocket.reply = function (send_data) {
                        if (send_data === undefined) { send_data = {}; }
                        isRunNewNext = true;
                        if (data.id && !data.id.startsWith(system_cfg.websocket_id_head)) {
                            arguments[0] = JSON.stringify({
                                code: 0,
                                message: 'success',
                                id: data.id,
                                method: data.method,
                                path: data.path,
                                data: send_data
                            });
                            return old_send.apply(ctx.websocket, arguments);
                        }
                        else {
                            let new_error = new Error("websocket: cannot reply");
                            new_error.name = 'ws_cannot_reply';
                            new_error.data = data;
                            throw new_error;
                        }
                    };

                    let new_next = async () => {
                        if (!isRunNewNext) {
                            isRunNewNext = true;
                            if (new_ctx.status === 0) {
                                if ((new_ctx.matched === undefined)
                                    || (isArray(new_ctx.matched) && new_ctx.matched.length <= 0)
                                ) {
                                    new_ctx.status = 404;
                                    throw new BaseApiError(BaseApiError.NOT_FOUND_ERROR, data);
                                }
                            }
                            else if (new_ctx.status == 200 && data.id && !data.id.startsWith(system_cfg.websocket_id_head)) {
                                new_ctx.websocket.reply(new_ctx.body);
                            }
                        }
                        return Promise.resolve();
                    };
                    await controller_fn(new_ctx, new_next);
                    if (!isRunNewNext) {
                        await new_next();
                    }
                }
            };
            return next();
        };

        if (isString(controller)) {
            controller = require(path.join(appdir, subdomain_cfg.websocket_socket_routes_path, controller));
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
module.exports = WS_URL_Router;
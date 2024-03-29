const require2 = require('tomjs/handlers/require2');
const path = require2('path');
const WebSocket = require2('ws');
const appdir = require2('tomjs/handlers/dir')();
const BaseApiError = require2('tomjs/error/base_api_error');
const WSRouterError = require2('tomjs/error/ws_router_error');
const WSTimeOutError = require2('tomjs/error/ws_timeout_error');
const KoaRouter = require2('koa-router');
const { isObject, isArray, isString, isFunction } = require2('tomjs/handlers/tools');
const subdomain_cfg = require2('tomjs/configs')().subdomain;
const websocket_cfg = require2('tomjs/configs')().websocket;
const AllWsServers = require2('tomjs/handlers/all_ws_server').getAllWS();
const Events = require2('tomjs/handlers/events');
const render = require2('tomjs/handlers/render');

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
        new_ctx.query = Object.assign({}, ctx.query);
        new_ctx.header = Object.assign({}, ctx.header, { data });
        new_ctx.headers = Object.assign({}, ctx.headers, { data });
        new_ctx.auth = ctx.auth;
        if (data.method) {
            new_ctx.method = data.method;
        }
        if (data.path) { new_ctx.path = data.path; }
        new_ctx.websocket.message = data;
        if (isObject(data) && data.data) {
            // new_ctx.request = { body: data.data };
            const method = data.method.trim().toUpperCase();
            if (method === 'POST' || method === 'PATCH') {
                new_ctx.request = { body: data.data };
            }
            else {
                new_ctx.query = Object.assign({}, data.data);
            }
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

        let broadcast = async function (send_data, all = false, type = 'all') {
            let iCount = 0;
            let ws_data = undefined;
            if (!isObject(send_data)) {
                ws_data = { data: send_data };
            }
            else if (!send_data.data) {
                ws_data = { data: send_data };
            }
            else {
                ws_data = send_data;
            }
            if (!all) {
                let user = ctx.auth.USER;
                if (!user) {
                    user = await ctx.auth.user();
                }
                if (!user) {
                    user = { id: undefined, name: undefined };
                }
                ws_data = Object.assign({}, { method: data.method, path: data.path, socket_id: new_ctx.websocket.socket_id, sender_id: user.id, sender_name: user.name }, ws_data);
            }
            else {
                ws_data = Object.assign({}, { method: data.method, path: data.path }, ws_data);
            }
            if (type == 'all' || type == 'ws') {
                if (new_ctx.websocket.servers.ws) {
                    new_ctx.websocket.servers.ws.clients.forEach(function each(client) {
                        if ((all || client !== new_ctx.websocket) && client.readyState === WebSocket.OPEN) {
                            client.send(ws_data);
                            iCount++;
                        }
                    });
                }
            }
            if (type == 'all' || type == 'wss') {
                if (new_ctx.websocket.servers.wss) {
                    new_ctx.websocket.servers.wss.clients.forEach(function each(client) {
                        if ((all || client !== new_ctx.websocket) && client.readyState === WebSocket.OPEN) {
                            client.send(ws_data);
                            iCount++;
                        }
                    });
                }
            }
            return iCount;
        };

        new_ctx.websocket._broadcast = broadcast;
        new_ctx.websocket.all_broadcast = function (send_data) {
            return broadcast(send_data, true, 'all');
        };
        new_ctx.websocket.servers.all_broadcast = new_ctx.websocket.all_broadcast;

        new_ctx.websocket.broadcast = async function (send_data) {
            return broadcast(send_data, false, 'all');
        };
        new_ctx.websocket.servers.broadcast = new_ctx.websocket.broadcast;

        //再次bind room相关函数 确保new_ctx对象是最新的
        AllWsServers.ctxBindBroadcastFn(new_ctx, data);

        if (isObject(new_ctx.websocket.servers.ws)) {
            new_ctx.websocket.servers.ws.all_broadcast = function (send_data) {
                return broadcast(send_data, true, 'ws');
            };
            new_ctx.websocket.servers.ws.broadcast = function (send_data) {
                return broadcast(send_data, false, 'ws');
            };
        }
        if (isObject(new_ctx.websocket.servers.wss)) {
            new_ctx.websocket.servers.wss.all_broadcast = function (send_data) {
                return broadcast(send_data, true, 'wss');
            };
            new_ctx.websocket.servers.wss.broadcast = function (send_data) {
                return broadcast(send_data, false, 'wss');
            };
        }

        return new_ctx;
    }

    path(path_str, controller, fnCheckParams = null) {
        let old_controller = controller;
        let controller_fn = () => { };

        let ws_route_fn = async (ctx, next) => {
            if (isFunction(fnCheckParams)) {
                const re = await fnCheckParams(ctx, next);
                if (!re) { return; }
            }
            let iSendID = 0;
            function getNewSendID() {
                iSendID++;
                return websocket_cfg.websocket_id_head + iSendID;
            }
            let AsyncObj = {};
            let old_send = ctx.websocket.send;
            let send = (method, path, send_data, user_id, user_name, id) => {
                let ws_data = {};
                if (path === undefined && send_data === undefined && user_id === undefined && user_name === undefined) {
                    if (id) {
                        if (!isObject(method)) {
                            ws_data = { data: method };
                        }
                        else if (!method.data) {
                            ws_data = { data: method };
                        }
                        else {
                            ws_data = method;
                        }
                        if (id) { ws_data.id = id; }
                    }
                    else { ws_data = method; }
                }
                else {
                    if (!isObject(send_data)) {
                        ws_data = { data: send_data };
                    }
                    else if (!send_data.data) {
                        ws_data = { data: send_data };
                    }
                    else {
                        ws_data = send_data;
                    }

                    if (id) { ws_data.id = id; }
                    if (method) { ws_data.method = method; }
                    if (path) { ws_data.path = path; }
                    if (user_id) { ws_data.sender_id = user_id; }
                    if (user_name) { ws_data.sender_name = user_name; }
                }
                return old_send(ws_data);
            };
            ctx.websocket.send = function (method, path, send_data) {
                return send(method, path, send_data);
            };
            ctx.websocket.sendAsync = function (method, path, send_data, timeout) {
                return new Promise((resolve, reject) => {
                    let id = getNewSendID();
                    send(method, path, send_data, undefined, undefined, id);
                    let timeout_handle = undefined;
                    let time_out = timeout || parseInt(websocket_cfg.websocket_send_time_out);
                    if (time_out > 0) {
                        let timeout_fn = function () {
                            if (AsyncObj[id]) { delete AsyncObj[id] }
                            reject(new WSTimeOutError('websocket time out:' + time_out, { id, method, path, data: send_data }));
                        }
                        timeout_handle = setTimeout(timeout_fn, time_out);
                    }
                    AsyncObj[id] = { resolve: resolve, reject: reject, timeout_handle: timeout_handle };
                });
            };

            ctx.websocket.on_message = async (data) => {
                if (isString(data.method)) {
                    data.method = data.method.trim().toUpperCase();
                }
                let new_ctx = this.cloneCTX(ctx, data);

                if (isObject(data) && data.id && data.id.startsWith(websocket_cfg.websocket_id_head)) {
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
                        emitter.emit('error_receive_reply', { data, new_ctx });
                    }
                }
                else {
                    let isRunNewNext = false;
                    new_ctx.websocket.reply = function (send_data, data) {
                        let ws_data = undefined;
                        if (!isObject(send_data)) {
                            ws_data = { data: send_data };
                        }
                        else if (!send_data.data) {
                            ws_data = { data: send_data };
                        }
                        else {
                            ws_data = send_data;
                        }
                        isRunNewNext = true;
                        if (data.id && !data.id.startsWith(websocket_cfg.websocket_id_head)) {
                            return old_send(Object.assign({}, {
                                code: 0,
                                message: 'OK',
                                id: data.id,
                                method: data.method,
                                path: data.path,
                            }, ws_data));
                        }
                        else {
                            let new_error = new Error("websocket: cannot reply");
                            new_error.name = 'ws_cannot_reply';
                            new_error.data = data;
                            throw new_error;
                        }
                    };

                    let old_data = data;
                    let new_next = async () => {
                        if (!isRunNewNext) {
                            isRunNewNext = true;
                            if ((new_ctx.status === 0) && ((new_ctx.matched === undefined)
                                || (isArray(new_ctx.matched) && new_ctx.matched.length <= 0)
                            )) {
                                new_ctx.status = 404;
                                throw new BaseApiError(BaseApiError.NOT_FOUND_ERROR, old_data);

                            }
                            else if ((new_ctx.status === 0 || new_ctx.status == 200) && old_data.id && !old_data.id.startsWith(websocket_cfg.websocket_id_head)) {
                                new_ctx.websocket.reply(new_ctx.body, old_data);
                            }
                        }
                        return Promise.resolve();
                    };
                    try {
                        await controller_fn(new_ctx, new_next);
                        if (!isRunNewNext) {
                            await new_next();
                        }
                    }
                    catch (error) {
                        if (new_ctx.websocket.error_send) {
                            new_ctx.websocket.error_send(error, data);
                        }
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
                throw new WSRouterError(`ws_router param:${old_controller}, error: Not find routes function`);
            }
        }
        else if (!isFunction(controller)) {
            throw new WSRouterError(`ws_router param:${old_controller}, error: Not a function or Object`);
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
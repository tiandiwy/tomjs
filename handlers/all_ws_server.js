const require2 = require('tomjs/handlers/require2');
const WebSocket = require2('ws');
const websocket_cfg = require2('tomjs/configs')().websocket;
const buildError = require2('tomjs/handlers/build_error');
const Events = require2('tomjs/handlers/events');
let emitter = Events.getEventEmitter('websocket');
const { isObject, isArray, arrDelete, arrAdd } = require2('tomjs/handlers/base_tools');
const { getUserIDByCTX } = require2('tomjs/handlers/listener_tools');

let all_sockets = {};
let all_auth_users = {};

async function sendDateByCTX(ctx, send_data) {
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
    let user = ctx.auth.USER;
    if (!user) {
        user = await ctx.auth.user();
    }

    let data = {};
    if (ctx.method) { data.method = ctx.method; }
    if (ctx.path) { data.path = ctx.path; }
    if (ctx.websocket) { data.socket_id = ctx.websocket.getID(); }
    if (user) {
        if (user.id) { data.sender_id = user.id; }
        if (user.name) { data.sender_name = user.name; }
    }
    return Object.assign({}, data, ws_data);
}

class AllWSServers {
    constructor() {
        this.ws = undefined;
        this.wss = undefined;
        this.rooms = {};
    };

    ctxBindBroadcastFn(ctx, data) {
        ctx.websocket.ws_server = this;
        ctx.websocket.createRoom = ctx.websocket.servers.createRoom.bind(ctx.websocket.servers, ctx);
        ctx.websocket.deleteRoom = ctx.websocket.servers.deleteRoom.bind(ctx.websocket.servers, ctx);
        ctx.websocket.changeRoomAdmin = ctx.websocket.servers.changeRoomAdmin.bind(ctx.websocket.servers, ctx);
        ctx.websocket.joinRoom = ctx.websocket.servers.joinRoom.bind(ctx.websocket.servers, ctx);
        ctx.websocket.leaveRoom = ctx.websocket.servers.leaveRoom.bind(ctx.websocket.servers, ctx);
        ctx.websocket.forceLeaveRoom = ctx.websocket.servers.leaveRoom.bind(ctx.websocket.servers);
        ctx.websocket.getRooms = ctx.websocket.servers.getRooms.bind(ctx.websocket.servers);
        if (data) { ctx.websocket.broadcastRoom = ctx.websocket.servers.broadcastRoom.bind(ctx.websocket.servers, ctx, data); }

        ctx.websocket.sendSocket = ctx.websocket.servers.sendSocketByCTX.bind(ctx.websocket.servers, ctx);
        ctx.websocket.sendSocketAsync = ctx.websocket.servers.sendSocketAsyncByCTX.bind(ctx.websocket.servers, ctx);
        ctx.websocket.sendSockets = ctx.websocket.servers.sendSocketsByCTX.bind(ctx.websocket.servers, ctx);
        ctx.websocket.sendSocketsAsync = ctx.websocket.servers.sendSocketsAsyncByCTX.bind(ctx.websocket.servers, ctx);
        ctx.websocket.sendUser = ctx.websocket.servers.sendUserByCTX.bind(ctx.websocket.servers, ctx);
        ctx.websocket.sendUserAsync = ctx.websocket.servers.sendUserAsyncByCTX.bind(ctx.websocket.servers, ctx);
        ctx.websocket.sendUsers = ctx.websocket.servers.sendUsersByCTX.bind(ctx.websocket.servers, ctx);
        ctx.websocket.sendUsersAsync = ctx.websocket.servers.sendUsersAsyncByCTX.bind(ctx.websocket.servers, ctx);
    }

    addSocket(ctx) {
        let socket = ctx.websocket;
        let id = socket.getID();
        if (!all_sockets[id]) {
            all_sockets[id] = { socket, rooms: [] };
            emitter.emit('add_socket', { ctx, socket_id: id });
        }
        else {
            all_sockets[id].socket = socket;
        }
    };

    deleteSocket(ctx) {
        let socket = ctx.websocket;
        let id = socket.getID();
        let user_id = ctx.auth.ID;
        if (all_sockets[id]) {
            if (user_id) {
                this.deleteUser(ctx);
            }

            let rooms = all_sockets[id].rooms;
            let room_count = rooms.length;
            for (let i = 0; i < room_count; i++) {
                this.leaveRoom(ctx, rooms[i], false);
            }
            delete all_sockets[id];
            emitter.emit('delete_socket', { ctx, socket_id: id, user_id });
        }
    };

    getSocket(id) {
        return all_sockets[id] || undefined;
    };

    getSockets(IDs) {
        if (!isArray(IDs)) {
            IDs = [IDs];
        }
        let clients = [];
        IDs.forEach(function (id) {
            if (all_sockets[id]) {
                clients.push(all_sockets[id]);
            }
        });
        return clients;
    };

    sendSocket(id, data) {
        let client = this.getSocket(id);
        if (client) { client.socket.send(data); return true; }
        else {
            buildError('sendSocket id error', { id, data }, undefined, 'AllWSServers_sendSocket_error');
        }
    };

    sendSocketAsync(id, data) {
        let client = this.getSocket(id);
        if (client) { return client.socket.sendAsync(data); }
        else {
            buildError('sendSocketAsync id error', { id, data }, undefined, 'AllWSServers_sendSocketAsync_error');
        }
    };

    async sendSocketByCTX(ctx, id, data) {
        if (ctx) {
            data = await sendDateByCTX(ctx, data);
        }
        return this.sendSocket(id, data);
    };

    async sendSocketAsyncByCTX(ctx, id, data) {
        if (ctx) {
            data = await sendDateByCTX(ctx, data);
        }
        return await this.sendSocketAsync(id, data);
    };

    sendSockets(IDs, data) {
        let iCount = 0;
        let arr = this.getSockets(IDs);
        arr.forEach(function (client) {
            client.socket.send(data);
            iCount++;
        });
        return iCount;
    };

    sendSocketsAsync(IDs, data) {
        let all = [];
        let arr = this.getSockets(IDs);
        arr.forEach(function (client) {
            all.push(client.socket.sendAsync(data));
        });
        return Promise.all(all);
    };

    async sendSocketsByCTX(ctx, IDs, data) {
        if (ctx) {
            data = await sendDateByCTX(ctx, data);
        }
        return this.sendSockets(IDs, data);
    };

    async sendSocketsAsyncByCTX(ctx, IDs, data) {
        if (ctx) {
            data = await sendDateByCTX(ctx, data);
        }
        return await this.sendSocketsAsync(IDs, data);
    };

    addUser(ctx) {
        let user_id = getUserIDByCTX(ctx);
        let socket = ctx.websocket;
        if (!isArray(all_auth_users[user_id])) {
            all_auth_users[user_id] = [];
        }
        if (!all_auth_users[user_id].includes(socket)) {
            all_auth_users[user_id].push(socket);
            emitter.emit('add_user', { ctx, user_id, count: all_auth_users[user_id].length });
        }
    }

    deleteUser(ctx) {
        let user_id = ctx.auth.ID;
        let socket = ctx.websocket;
        if (all_auth_users[user_id]) {
            let arr = arrDelete(all_auth_users[user_id], socket);
            if (arr.length <= 0) {
                delete all_auth_users[user_id];
            }
            emitter.emit('delete_user', { ctx, user_id, count: arr.length });
        }
    };

    getUser(id) {
        return all_auth_users[id] || [];
    };

    getUserIDBySocket(socket) {
        let arr = Object.getOwnPropertyNames(all_auth_users);
        let len = arr.length;
        for (let i = 0; i < len; i++) {
            if (typeof (all_auth_users[arr[i]]) != "function") {
                if (all_auth_users[arr[i]].include(socket)) {
                    return arr[i];
                }
            }
        }
        return undefined;
    };

    getUsers(IDs) {
        if (!isArray(IDs)) {
            IDs = [IDs];
        }
        let clients = [];
        IDs.forEach(function (id) {
            if (all_auth_users[id]) { clients = clients.concat(all_auth_users[id]); }
        });
        return clients;
    };

    sendUser(id, data) {
        let iCount = 0;
        let clients = this.getUser(id);
        clients.forEach(function (client) {
            client.send(data);
            iCount++;
        });
        return iCount;
    };

    sendUserAsync(id, data) {
        let all = [];
        let arr = this.getUser(id);
        arr.forEach(function (client) {
            all.push(client.sendAsync(data));
        });
        return Promise.all(all);
    };

    async sendUserByCTX(ctx, id, data) {
        if (ctx) {
            data = await sendDateByCTX(ctx, data);
        }
        return this.sendUser(id, data);
    };

    async sendUserAsyncByCTX(ctx, id, data) {
        if (ctx) {
            data = await sendDateByCTX(ctx, data);
        }
        return await this.sendUserAsync(id, data);
    };

    sendUsers(IDs, data) {
        let iCount = 0;
        let arr = this.getUsers(IDs);
        arr.forEach(function (client) {
            client.send(data);
            iCount++;
        });
        return iCount;
    };

    sendUsersAsync(IDs, data) {
        let all = [];
        let arr = this.getUsers(IDs);
        arr.forEach(function (client) {
            all.push(client.sendAsync(data));
        });
        return Promise.all(all);
    };

    async sendUsersByCTX(ctx, IDs, data) {
        if (ctx) {
            data = await sendDateByCTX(ctx, data);
        }
        return this.sendUsers(IDs, data);
    };

    async sendUsersAsyncByCTX(ctx, IDs, data) {
        if (ctx) {
            data = await sendDateByCTX(ctx, data);
        }
        return await this.sendUsersAsync(IDs, data);
    };

    getRooms() {
        return this.rooms;
    }

    createRoom(ctx, room_name, isAdmin = false) {
        let websocket = undefined;
        if (ctx) {
            if (ctx.websocket) {
                websocket = ctx.websocket;
            }
        }
        if (!this.rooms[room_name]) {
            this.rooms[room_name] = { creater: isAdmin ? websocket : null, users: [] };
            emitter.emit('create_room', { ctx, room_name });
            if (ctx && websocket_cfg.create_room_auto_join) {
                this.joinRoom(ctx, room_name);
            }
        }
        return this.rooms[room_name];
    };

    deleteRoom(ctx, room_name, force = false) {
        if (!this.rooms[room_name]) {
            let websocket = undefined;
            if (ctx) {
                if (ctx.websocket) {
                    websocket = ctx.websocket;
                }
            }
            if (force || (!ctx) || (this.rooms[room_name].creater === websocket)) {
                this.rooms[room_name].users.forEach(function each(user_ctx) {
                    this.leaveRoom(user_ctx, room_name);
                });
                delete this.rooms[room_name];
                emitter.emit('delete_room', { ctx, room_name, auto: false });
                return true;
            }
        }
        return false;
    }

    changeRoomAdmin(ctx, room_name, new_ctx, force = false) {
        if (!this.rooms[room_name]) {
            let socket = undefined;
            if (ctx) {
                if (ctx.websocket) {
                    socket = ctx.websocket;
                }
            }
            if (force || (!ctx) || (this.rooms[room_name].creater === socket)) {
                let new_socket = undefined;
                if (new_ctx) {
                    if (new_ctx.websocket) {
                        new_socket = new_ctx.websocket;
                    }
                }
                this.rooms[room_name].creater = new_socket;
                emitter.emit('change_room_admin', { ctx, room_name, new_ctx });
                return true;
            }
        }
        return false;
    }

    joinRoom(ctx, room_name, isAdmin = false) {
        let socket_id = undefined;
        let socket = undefined;
        if (ctx) {
            if (ctx.websocket) {
                socket = ctx.websocket;
                socket_id = ctx.websocket.getID();
            }
        }
        let roomObj = this.createRoom(ctx, room_name);
        if (!roomObj.users.find((val) => val.websocket === socket)) {
            roomObj.users.push(ctx);

            //和all_sockets做关联 方便用户下线了，自动检测并离开聊天室
            if (all_sockets[socket_id]) {
                arrAdd(all_sockets[socket_id].rooms, room_name);
            }
            if (isAdmin) { roomObj.creater = socket }
            emitter.emit('join_room', { ctx, room_name });
        }
    }

    leaveRoom(ctx, room_name, del_socket_room = true) {
        let socket_id = undefined;
        let socket = undefined;
        if (ctx) {
            if (ctx.websocket) {
                socket = ctx.websocket;
                socket_id = ctx.websocket.getID();
            }
        }
        if (this.rooms[room_name]) {
            if (del_socket_room) {
                if (all_sockets[socket_id]) {
                    arrDelete(all_sockets[socket_id].rooms, room_name);
                }
            }
            arrDelete(this.rooms[room_name].users, ctx, (val) => val.websocket === socket);
            emitter.emit('leave_room', { ctx, room_name });
            if (websocket_cfg.auto_delete_empty_room) {
                if (this.rooms[room_name].users.length <= 0) {
                    delete this.rooms[room_name];
                    emitter.emit('delete_room', { ctx, room_name, auto: true });
                }
            }
        }
    }

    async broadcastRoom(ctx, data, room_name, send_data, all = false) {
        let socket_id = undefined;
        let socket = undefined;
        if (ctx) {
            if (ctx.websocket) {
                socket = ctx.websocket;
                socket_id = ctx.websocket.getID();
            }
        }
        if (this.rooms[room_name] && (this.rooms[room_name].users.find((val) => val.websocket === socket) || !ctx)) {
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
                ws_data = Object.assign({}, { method: data.method, path: data.path, room_name, socket_id, sender_id: user.id, sender_name: user.name }, ws_data);
            }
            else {
                ws_data = Object.assign({}, { method: data.method, path: data.path, room_name }, ws_data);
            }

            this.rooms[room_name].users.forEach(function each(client) {
                if ((all || client.websocket !== socket) && client.websocket.readyState === WebSocket.OPEN) {
                    client.websocket.send(ws_data);
                    iCount++;
                }
            });
            return iCount;
        }
        else {
            return undefined;
        }
    }
};

let all_ws_server = new AllWSServers;

module.exports = new function () {
    this.setWS = function (ws, isWSS) {
        if (isWSS) {
            if (all_ws_server.wss !== ws) {
                all_ws_server.wss = ws;
            }
        }
        else {
            if (all_ws_server.ws !== ws) {
                all_ws_server.ws = ws;
            }
        }
    };
    this.getAllWS = function () { return all_ws_server; };
}
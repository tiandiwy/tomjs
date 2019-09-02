const require2 = require('tomjs/handlers/require2');
const WebSocket = require2('ws');
const websocket_cfg = require2('tomjs/configs')().websocket;
const Events = require2('tomjs/handlers/events');
let emitter = Events.getEventEmitter('websocket');
const { isObject, isArray, arrDelete, arrAdd } = require2('tomjs/handlers/base_tools');
const { getUserIDByCTX } = require2('tomjs/handlers/listener_tools');

let all_sockets = {};
let all_auth_users = {};

class AllWSServers {
    constructor() {
        this.ws = undefined;
        this.wss = undefined;
        this.rooms = {};
    };

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
        if (all_sockets[id]) {
            return all_sockets[id];
        }
        else { return undefined; };
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
        if (client) { client.send(data); return true; }
        else { return false }
    };

    sendSockets(IDs, data) {
        let iCount = 0;
        let arr = this.getSockets(IDs);
        arr.forEach(function (client) {
            client.send(data);
            iCount++;
        });
        return iCount;
    };

    addUser(ctx) {
        let user_id = getUserIDByCTX(ctx);
        let socket = ctx.websocket;
        if (!isArray(all_auth_users[user_id])) {
            all_auth_users[user_id] = [];
        }
        all_auth_users[user_id].push(socket);
        emitter.emit('add_user', { ctx, user_id, count: all_auth_users[user_id].length });
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

    getUsers(IDs) {
        if (!isArray(IDs)) {
            IDs = [IDs];
        }
        let clients = [];
        IDs.forEach(function (id) {
            if (all_auth_users[id]) { clients = clients.concat(all_auth_users[idx]); }
        });
        return clients;
    };

    sendUser(id, data) {
        let client = this.getUser(id);
        if (client) { client.send(data); return true; }
        else { return false }
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

    createRoom(ctx, room_name) {
        let socket_id = undefined;
        if (ctx) {
            socket_id = ctx.websocket.getID();
        }
        if (!this.rooms[room_name]) {
            this.rooms[room_name] = { creater: socket_id, users: [] };
            emitter.emit('create_room', { ctx, room_name });
            if (ctx && websocket_cfg.create_room_auto_join) {
                this.joinRoom(ctx, room_name);
            }
        }
        return this.rooms[room_name];
    };

    deleteRoom(ctx, room_name) {
        if (!this.rooms[room_name]) {
            let socket_id = undefined;
            if (ctx) {
                socket_id = ctx.websocket.getID();
            }
            if ((!ctx) || (this.rooms[room_name].creater === socket_id)) {
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

    changeRoomAdmin(ctx, new_ctx, room_name) {
        if (!this.rooms[room_name]) {
            let socket_id = undefined;
            if (ctx) {
                socket_id = ctx.websocket.getID();
            }
            if ((!ctx) || (this.rooms[room_name].creater === socket_id)) {
                let new_socket_id = undefined;
                if (new_ctx) {
                    new_socket_id = new_ctx.websocket.getID();
                }
                this.rooms[room_name].creater = new_socket_id;
                emitter.emit('change_room_admin', { ctx, room_name, new_ctx });
                return true;
            }
        }
        return false;
    }

    joinRoom(ctx, room_name) {
        let socket_id = ctx.websocket.getID();
        let roomObj = this.createRoom(ctx, room_name);
        if (!roomObj.users.find((val) => val.websocket.getID() === socket_id)) {
            roomObj.users.push(ctx);

            //和all_sockets做关联 方便用户下线了，自动检测并离开聊天室
            if (all_sockets[socket_id]) {
                arrAdd(all_sockets[socket_id].rooms, room_name);
            }
            emitter.emit('join_room', { ctx, room_name });
        }
    }

    leaveRoom(ctx, room_name, del_socket_room = true) {
        let socket_id = ctx.websocket.getID();
        if (this.rooms[room_name]) {
            if (del_socket_room) {
                if (all_sockets[socket_id]) {
                    arrDelete(all_sockets[socket_id].rooms, room_name);
                }
            }
            arrDelete(this.rooms[room_name].users, ctx, (val) => val.websocket.getID() === socket_id);
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
        if (this.rooms[room_name] && (this.rooms[room_name].users.includes(ctx) || !ctx)) {
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
                ws_data = Object.assign({}, { method: data.method, path: data.path, room_name, socket_id: ctx.websocket.getID(), sender_id: user.id, sender_name: user.name }, ws_data);
            }
            else {
                ws_data = Object.assign({}, { method: data.method, path: data.path, room_name }, ws_data);
            }

            this.rooms[room_name].users.forEach(function each(client) {
                if ((all || client !== ctx) && client.websocket.readyState === WebSocket.OPEN) {
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
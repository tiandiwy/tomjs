let all_ws_server = { ws: undefined, wss: undefined };
module.exports = new function () {
    this.setWS = function (ws, isWSS) {
        if (isWSS) { all_ws_server.wss = ws; }
        else { all_ws_server.ws = ws; }
    };
    this.getAllWS = function () { return all_ws_server; };
}
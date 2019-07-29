const require2 = require('tomjs/handlers/require2');
const Redis = require2('ioredis');
const { isString } = require2('tomjs/handlers/base_tools');

let all = {};
module.exports = function (server, options) {
    let idx = (!isString(server) ? JSON.stringify(server) : server.trim()) + (options ? (' ' + (!isString(options) ? JSON.stringify(options) : options)) : '');
    if (!all[idx]) {
        if (options) {
            all[idx] = new Redis(server, options);
        }
        else {
            all[idx] = new Redis(server);
        }
    }
    return all[idx];
}
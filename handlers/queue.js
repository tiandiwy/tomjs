const require2 = require('tomjs/handlers/require2');
const {default: PQueue} = require2('p-queue');
const queue_cfg = require2('tomjs/configs')().queue;
let all = {};
module.exports = function(name = "default", options) {
    if (!all[name]) {
        all[name] = new PQueue(options || ( queue_cfg[name] || queue_cfg.default ));
    }
    return all[name];
}
const require2 = require('tomjs/handlers/require2');
const log4js = require2('log4js');
const log_cfg = require2('tomjs/configs')().log;

log4js.configure(log_cfg.log4js);
let logInfo = log4js.getLogger();
let len = log_cfg.bind.length;
for (let i = 0; i < len; i++) {
    switch (log_cfg.bind[i]) {
        case 'log':
            console.log = logInfo.info.bind(logInfo);
            break;
        case 'info':
            console.info = logInfo.info.bind(logInfo);
            break;
        case 'error':
            console.error = logInfo.error.bind(logInfo);
            break;
        case 'warn':
            console.warn = logInfo.warn.bind(logInfo);
            break;
    }
}

module.exports = log4js;
const require2 = require('tomjs/handlers/require2');
const path = require2('path');
const app_dir = require2('tomjs/handlers/dir')();
const CronsError = require2('tomjs/error/crons_error');
const CronJob = require2('cron').CronJob;
const cron_cfg = require2('tomjs/configs')().cron;

const { isObject, isArray, isClass, isFunction, isString } = require2('tomjs/handlers/listener_tools');

function checkFunc(func) {
    let reFunc = undefined;
    if (isFunction(func)) { reFunc = func; }
    else if (isString(func)) {
        let file_arr = func.split('@');
        let listener = undefined;
        let filename = path.join(app_dir, './crons/', file_arr[0]);

        let listener_class = require(filename);
        if (isClass(listener_class)) {
            listener = new listener_class();
            let func_name = undefined;
            if (file_arr.length > 1) { func_name = file_arr[1]; }
            if (func_name === undefined) {
                throw new CronsError(CronsError.FUNC_NOT_FIND_ERROR, func);
            }
            if (isFunction(listener[func_name])) {
                reFunc = listener[func_name].bind(listener);
            }
            else {
                throw new CronsError(CronsError.FUNC_NOT_FIND_ERROR, func);
            }
        }
        else if (isFunction(listener_class)) {
            reFunc = listener_class;
        }
        else {
            throw new CronsError(CronsError.FUNC_NOT_FIND_ERROR, func);
        }

    }
    return reFunc;
}

let crons = [];
if (cron_cfg && isArray(cron_cfg.crons) && cron_cfg.crons.length > 0) {
    cron_cfg.crons.forEach(item => {
        if (isObject(item)) {
            crons.push(new CronJob(item.cronTime,
                checkFunc(item.onTick),
                item.onComplete,
                item.start,
                item.timeZone,
                item.context,
                item.runOnInit,
                item.utcOffset,
                item.unrefTimeout
            ));
        }
    });
}

module.exports = crons;

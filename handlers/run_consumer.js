const require2 = require('tomjs/handlers/require2');
const path = require2('path');
const app_dir = require2('tomjs/handlers/dir')();
const streams_cfg = require2('tomjs/configs')().streams;
const { isObject, isArray, isClass, isFunction, isString, analysisConfig } = require2('tomjs/handlers/listener_tools');
const { getConsumer } = require2('tomjs/streams');
const StreamsError = require2('tomjs/error/streams_error');
const Events = require2('tomjs/handlers/events');
const uuidv4 = require('uuid/v4');
const split = ';';
let ConsumerArr = [];

//判断是否需要自动运行
let runing = false;
if (streams_cfg.boot_run_consumers && !runing) { runing = true; run(); }

function checkFunc(config) {
    let func = config.func;
    let allFuncs = [];
    if (isFunction(func)) { allFuncs[0] = func; }
    if (isString(func)) {
        allFuncs = func.split(';');
    } else if (isArray(func)) {
        allFuncs = func;
    }
    let len = allFuncs.length;
    for (let i = 0; i < len; i++) {
        if (isString(allFuncs[i])) {
            let file_arr = allFuncs[i].split('@');
            let listener = undefined;
            let listenerIsClass = false;
            let filename = path.join(app_dir, './consumers/', file_arr[0]);
            try {
                let listener_class = require(filename);
                listenerIsClass = isClass(listener_class);
                if (listenerIsClass) {
                    listener = new listener_class();
                    let func_name = undefined;
                    if (file_arr.length > 1) { func_name = file_arr[1]; }
                    else {
                        let fn_name_arr = config.stream.split(streams_cfg.split);
                        if (fn_name_arr.length > 1) {
                            func_name = fn_name_arr[1].trim();
                        }
                    }
                    if (func_name === undefined) {
                        throw new StreamsError(StreamsError.STREAM_CONSUMERS_CLASS_FUNC_NOT_FIND_ERROR, file_arr, ' by:', config);
                    }
                    if (isFunction(listener[func_name])) {
                        allFuncs[i] = listener[func_name];
                    }
                    else {
                        throw new StreamsError(StreamsError.STREAM_CONSUMERS_FUNC_LOAD_ERROR, file_arr, ' by:', config);
                    }
                }
                else {
                    if (isFunction(listener_class)) {
                        allFuncs[i] = listener_class;
                    }
                    else {
                        throw new StreamsError(StreamsError.STREAM_CONSUMERS_FUNC_LOAD_ERROR, file_arr, ' by:', config);
                    }
                }
            }
            catch (error) {
                throw new StreamsError(StreamsError.STREAM_CONSUMERS_FUNC_LOAD_ERROR, file_arr, ' by:', config);
            }

        }
    }
    return allFuncs;
}

async function build(server_name, config) {
    let name = '$uuid';
    if (isFunction(config.name)) {
        name = config.name(server_name, config);
    } else if (isString(config.name)) {
        name = config.name;
        if (name.trim().toLowerCase() == '$uuid') {
            name = uuidv4();
        }
    }

    let stream = config.stream;
    let group = config.group;

    let server_info = undefined;
    if (config.server) {
        server_info = analysisConfig(config);
    }
    else {
        server_info = analysisConfig(server_name);
    }

    let server_head = server_name;
    if (server_info) {
        server_head = isObject(server_info.server) ? JSON.stringify(server_info.server) : server_info.server;
    }

    let func_arr = checkFunc(config);

    let idx = server_head + split + stream + split + group + split + name;
    let consumer = undefined;
    if (ConsumerArr[idx]) {
        consumer = ConsumerArr[idx];
    }
    else {
        consumer = getConsumer(server_info, group, name);
        ConsumerArr[idx] = consumer;
    }
    for await (const [id, msg] of consumer) {
        let funcCount = func_arr.length;
        for (let i = 0; i < funcCount; i++) {
            //consumer含有 stream,group,consumer[即name]属性
            let re = (func_arr[i])(consumer, id, msg);
            if (streams_cfg.auto_ack_by_not_false && re !== false) {
                await consumer.ack(id);
            }
            if (!consumer.running) { break; }
        }
    }
}

async function run() {
    if (isObject(streams_cfg.consumers)) {
        for (let idx in streams_cfg.consumers) {
            if (!isObject(streams_cfg.consumers[idx])) {
                throw new StreamsError(StreamsError.STREAM_CONSUMERS_NOT_FIND_ERROR, streams_cfg.consumers[idx]);
            }
            if (!streams_cfg.consumers[idx].stream) {
                streams_cfg.consumers[idx].stream = idx;
            }
            if (!streams_cfg.consumers[idx].group) {
                throw new StreamsError(StreamsError.SERVER_CONSUMERS_GROUP_NOT_FIND_ERROR, streams_cfg.consumers[idx]);
            }
            if (!streams_cfg.consumers[idx].name) {
                throw new StreamsError(StreamsError.STREAM_CONSUMERS_NAME_NOT_FIND_ERROR, streams_cfg.consumers[idx]);
            }
            if (!streams_cfg.consumers[idx].func) {
                throw new StreamsError(StreamsError.STREAM_CONSUMERS_FUNC_NOT_FIND_ERROR, streams_cfg.consumers[idx]);
            }
            build(idx, streams_cfg.consumers[idx]);
        }
    }
}

function getAllConsumer() {
    return ConsumerArr;
}

function allShutdown() {
    let emitter = Events.getEventEmitter('consumer');
    for (let idx in ConsumerArr) {
        try {
            ConsumerArr[idx].shutdown();
        }
        catch (error) {
            emitter.emit('error', { error, idx, ConsumerArr });
        }
    }
}

module.exports = { run, getAllConsumer, allShutdown };